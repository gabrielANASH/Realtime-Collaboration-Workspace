import type { WorkspaceRole } from '@prisma/client';

type RolePermissions = {
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canUpdateRoles: boolean;
  canRemoveOwner: boolean;
};

const rolePermissions: Record<WorkspaceRole, RolePermissions> = {
  owner: {
    canInviteMembers: true,
    canRemoveMembers: true,
    canUpdateRoles: true,
    canRemoveOwner: false,
  },
  admin: {
    canInviteMembers: true,
    canRemoveMembers: true,
    canUpdateRoles: true,
    canRemoveOwner: false,
  },
  member: {
    canInviteMembers: false,
    canRemoveMembers: false,
    canUpdateRoles: false,
    canRemoveOwner: false,
  },
  viewer: {
    canInviteMembers: false,
    canRemoveMembers: false,
    canUpdateRoles: false,
    canRemoveOwner: false,
  },
};

export function getPermissions(role: WorkspaceRole): RolePermissions {
  return rolePermissions[role];
}

export function canPromoteToRole(actorRole: WorkspaceRole, targetRole: WorkspaceRole): boolean {
  if (targetRole === 'owner') {
    return false;
  }

  if (actorRole === 'owner' || actorRole === 'admin') {
    return true;
  }

  return false;
}

export function isHigherRole(role1: WorkspaceRole, role2: WorkspaceRole): boolean {
  const hierarchy: Record<WorkspaceRole, number> = {
    owner: 3,
    admin: 2,
    member: 1,
    viewer: 0,
  };

  return hierarchy[role1] > hierarchy[role2];
}
