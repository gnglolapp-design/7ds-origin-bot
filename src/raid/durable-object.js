const ROLE_ORDER = ["DPS", "Buffer", "Debuffer", "Heal", "Défense"];

function nowIso() {
  return new Date().toISOString();
}



function cleanText(value, fallback = "") {
  const s = String(value ?? fallback).trim();
  return s;
}
function normalizeMember(member) {
  return {
    userId: String(member.userId),
    worldLevel: String(member.worldLevel || "?"),
    role: ROLE_ORDER.includes(member.role) ? member.role : "DPS",
    joinedAt: member.joinedAt || nowIso(),
  };
}

export class RaidDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async _getAll() {
    return (await this.state.storage.get("raids")) || {};
  }

  async _putAll(raids) {
    await this.state.storage.put("raids", raids);
  }

  _ensureRaid(raids, id) {
    const raid = raids[id];
    if (!raid || raid.deleted) return null;
    raid.members = Array.isArray(raid.members) ? raid.members.map(normalizeMember) : [];
    raid.isOpen = raid.isOpen !== false;
    raid.createdAt = raid.createdAt || nowIso();
    raid.type = raid.type || "PvE";
    raid.category = raid.category || "pve";
    raid.note = raid.note || "";
    raid.time = raid.time || "?";
    return raid;
  }

  _sortMembers(raid) {
    raid.members.sort((a, b) => {
      const roleDiff = ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role);
      if (roleDiff !== 0) return roleDiff;
      return String(a.userId).localeCompare(String(b.userId));
    });
  }

  async fetch(request) {
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    const body = await request.json();
    const raids = await this._getAll();

    if (body.op === "create") {
      const id = String(Date.now());
      raids[id] = {
        id,
        category: body.category || "pve",
        type: body.type || "PvE",
        typeKey: body.typeKey || "pve",
        time: body.time || "?",
        note: body.note || "",
        ownerId: body.ownerId,
        isOpen: true,
        deleted: false,
        createdAt: nowIso(),
        members: [],
      };
      await this._putAll(raids);
      return Response.json(raids[id]);
    }

    if (body.op === "join") {
      const raid = this._ensureRaid(raids, body.id);
      if (!raid) return Response.json({ error: "not_found" }, { status: 404 });
      if (!raid.isOpen) return Response.json({ error: "closed" }, { status: 409 });
      const idx = raid.members.findIndex((m) => m.userId === String(body.userId));
      if (idx === -1) {
        raid.members.push(normalizeMember({ userId: body.userId, worldLevel: body.worldLevel, role: "DPS" }));
      } else {
        raid.members[idx] = normalizeMember({ ...raid.members[idx], worldLevel: body.worldLevel });
      }
      this._sortMembers(raid);
      await this._putAll(raids);
      return Response.json(raid);
    }

    if (body.op === "setRole") {
      const raid = this._ensureRaid(raids, body.id);
      if (!raid) return Response.json({ error: "not_found" }, { status: 404 });
      if (!raid.isOpen) return Response.json({ error: "closed" }, { status: 409 });
      const idx = raid.members.findIndex((m) => m.userId === String(body.userId));
      if (idx === -1) return Response.json({ error: "not_joined" }, { status: 409 });
      raid.members[idx] = normalizeMember({ ...raid.members[idx], role: body.role });
      this._sortMembers(raid);
      await this._putAll(raids);
      return Response.json(raid);
    }

    if (body.op === "leave") {
      const raid = this._ensureRaid(raids, body.id);
      if (!raid) return Response.json({ error: "not_found" }, { status: 404 });
      raid.members = raid.members.filter((m) => m.userId !== String(body.userId));
      await this._putAll(raids);
      return Response.json(raid);
    }

    if (body.op === "toggle") {
      const raid = this._ensureRaid(raids, body.id);
      if (!raid) return Response.json({ error: "not_found" }, { status: 404 });
      if (raid.ownerId && raid.ownerId !== body.userId) return Response.json({ error: "forbidden" }, { status: 403 });
      raid.isOpen = !raid.isOpen;
      await this._putAll(raids);
      return Response.json(raid);
    }

    if (body.op === "delete") {
      const raid = this._ensureRaid(raids, body.id);
      if (!raid) return Response.json({ error: "not_found" }, { status: 404 });
      if (raid.ownerId && raid.ownerId !== body.userId) return Response.json({ error: "forbidden" }, { status: 403 });
      raid.deleted = true;
      await this._putAll(raids);
      return Response.json({ ...raid, deleted: true });
    }

    if (body.op === "edit") {
      const raid = this._ensureRaid(raids, body.id);
      if (!raid) return Response.json({ error: "not_found" }, { status: 404 });
      if (raid.ownerId && raid.ownerId !== body.userId) return Response.json({ error: "forbidden" }, { status: 403 });
      raid.time = cleanText(body.time, raid.time) || raid.time || "?";
      raid.note = cleanText(body.note, raid.note);
      await this._putAll(raids);
      return Response.json(raid);
    }

    if (body.op === "get") {
      const raid = this._ensureRaid(raids, body.id);
      if (!raid) return Response.json({ error: "not_found" }, { status: 404 });
      return Response.json(raid);
    }

    return Response.json({ error: "bad_op" }, { status: 400 });
  }
}
