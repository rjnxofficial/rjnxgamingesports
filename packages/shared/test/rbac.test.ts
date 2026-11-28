import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { ROLE_WEIGHT, rolesAtLeast } from "@rjnx/shared";

/**
 * Role-policy tests.
 *
 * The admin console must never let a user promote themselves, and only
 * super admins may touch roles, platform settings, suspensions or the audit log.
 * These assertions are structural (they read the server action module) because
 * the guard is what needs to be protected: a refactor that drops it would
 * otherwise pass every other test.
 */
const actionsFile = path.resolve(import.meta.dirname, "../../../apps/web/src/server/actions/admin.ts");
const actions = readFileSync(actionsFile, "utf8");

function actionBody(name: string): string {
  const start = actions.indexOf(`export async function ${name}(`);
  assert.ok(start >= 0, `${name} is missing`);
  const rest = actions.slice(start + 1);
  const next = rest.search(/\nexport async function /);
  return next === -1 ? actions.slice(start) : rest.slice(0, next);
}

describe("role weights", () => {
  it("orders roles from super_admin down to player", () => {
    assert.ok(ROLE_WEIGHT.super_admin > ROLE_WEIGHT.admin);
    assert.ok(ROLE_WEIGHT.admin > ROLE_WEIGHT.tournament_manager);
    assert.ok(ROLE_WEIGHT.tournament_manager > ROLE_WEIGHT.moderator);
    assert.ok(ROLE_WEIGHT.moderator > ROLE_WEIGHT.player);
  });

  it("treats only moderator and above as staff", () => {
    assert.equal(rolesAtLeast(["player"], "moderator"), false);
    assert.equal(rolesAtLeast(["moderator"], "moderator"), true);
    assert.equal(rolesAtLeast(["tournament_manager"], "moderator"), true);
    assert.equal(rolesAtLeast(["super_admin"], "admin"), true);
  });
});

describe("admin action authorization", () => {
  const guarded = ["saveTournamentAction", "publishRoomAction", "verifyResultsAction", "saveNewsAction"];

  for (const name of guarded) {
    it(`${name} requires a staff session`, () => {
      assert.match(actionBody(name), /getStaff\(|requireStaff/);
    });
  }

  const superAdminOnly = ["grantRoleAction", "revokeRoleAction", "suspendUserAction", "saveSettingAction"];
  for (const name of superAdminOnly) {
    it(`${name} requires a super admin`, () => {
      const body = actionBody(name);
      assert.match(body, /getSuperAdmin\(|requireSuperAdmin/);
      assert.match(body, /session\.user\.id/, "identity must come from the server session");
    });
  }

  it("refuses to let anyone change their own roles", () => {
    for (const name of ["grantRoleAction", "revokeRoleAction"]) {
      assert.match(
        actionBody(name),
        /=== session\.user\.id/,
        `${name} must compare the target user with the session user`,
      );
    }
  });

  it("refuses to remove or suspend the last super admin", () => {
    assert.match(actionBody("revokeRoleAction"), /last super admin/i);
    assert.match(actionBody("suspendUserAction"), /last super admin/i);
  });

  it("logs an audit entry for every mutating action", () => {
    const mutations = [
      "saveTournamentAction",
      "setTournamentStatusAction",
      "reviewRegistrationAction",
      "publishRoomAction",
      "verifyResultsAction",
      "recalculateLeaderboardAction",
      "grantRoleAction",
      "revokeRoleAction",
      "suspendUserAction",
      "saveBannerAction",
      "deleteBannerAction",
      "replyTicketAction",
      "saveScoringRuleAction",
      "saveSettingAction",
      "broadcastNotificationAction",
    ];
    for (const name of mutations) {
      assert.match(actionBody(name), /writeAudit\(/, `${name} must write an audit entry`);
    }
  });
});
