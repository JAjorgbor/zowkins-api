const portalUserRoles = {
  manager: [],
  collaborator: [],
};

const adminUserRoles = {
  devOps: [
    "getUsers",
    "getAdminUsers",
    "getInventory",
    "updateApp",
    "updateInventory",
    "updateAdminUser",
    "updateAdminUserRole",
    "removeAdminUser",
    "adminUserInvite",
    "updateAdminSettings",
    "adminUpdateStatus",
    "getReferralPartners",
    "manageReferralPartners",
    "manageCustomers",
    "manageOrders",
    "getOrders",
  ],
  administrator: [
    "getUsers",
    "getInventory",
    "updateApp",
    "updateInventory",
    "getAdminUsers",
    "updateAdminUser",
    "updateAdminUserRole",
    "adminUserInvite",
    "updateAdminSettings",
    "adminUpdateStatus",
    "getReferralPartners",
    "manageReferralPartners",
    "manageCustomers",
    "manageOrders",
    "getOrders",
  ],
  operations: [
    "getUsers",
    "getAdminUsers",
    "updateApp",
    "getInventory",
    "updateInventory",
    "updateAdminUser",
    "updateAdminUserRole",
    "adminUserInvite",
    "updateAdminSettings",
    "adminUpdateStatus",
    "getReferralPartners",
    "manageReferralPartners",
    "manageCustomers",
    "manageOrders",
    "getOrders",
  ],
  storeManager: [
    "getUsers",
    "getAdminUsers",
    "getInventory",
    "updateInventory",
    "getReferralPartners",
    "manageOrders",
    "getOrders",
  ],
  marketingAndSales: [
    "getUsers",
    "getAdminUsers",
    "getInventory",
    "getReferralPartners",
    "updateInventory",
    "getOrders",
  ],
  accountant: [
    "getUsers",
    "getAdminUsers",
    "getReferralPartners",
    "getInventory",
    "getOrders",
  ],
  driver: ["getUsers", "getAdminUsers", "getInventory", "getOrders"],
} as const;

const referralPartnerProfessions = {
  doctor: "Dr",
  nurse: "Nurse",
  pharmacist: "Pharm",
  chemist: "Chem",
  "lab technician": "Lab Tech",
  other: "",
} as const;

const normalizedReferralPartnerProfessions = Object.keys(
  referralPartnerProfessions,
);

const allRoles = {
  ...portalUserRoles,
  ...adminUserRoles,
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

const userRoleOptions = Object.keys(portalUserRoles);
const adminUserRoleOptions = Object.keys(adminUserRoles);

export type AdminUserPermissions =
  (typeof adminUserRoles)[keyof typeof adminUserRoles][number];
export type UserPermissions =
  (typeof portalUserRoles)[keyof typeof portalUserRoles][number];

function getAdminRolesWithPermission(permission: string) {
  return Object.entries(adminUserRoles)
    .filter(([_, permissions]) => permissions.includes(permission as any))
    .map(([role]) => role);
}

export default {
  userRoles: portalUserRoles,
  getAdminRolesWithPermission,
  adminUserRoles,
  roles,
  roleRights,
  userRoleOptions,
  adminUserRoleOptions,
  referralPartnerProfessions,
  normalizedReferralPartnerProfessions,
};
