const ROLE_SCOPING = {
  owner: {
    seeRevenue: true,
    seeCosts: true,
    manageTeam: true,
    assignedOnly: false,
  },
  director: {
    seeRevenue: true,
    seeCosts: true,
    manageTeam: true,
    assignedOnly: false,
  },
  manager_operations: {
    seeRevenue: false,
    seeCosts: true,
    manageTeam: false,
    assignedOnly: false,
  },
  manager_hr: {
    seeRevenue: false,
    seeCosts: false,
    manageTeam: true,
    assignedOnly: false,
  },
  staff: {
    seeRevenue: false,
    seeCosts: false,
    manageTeam: false,
    assignedOnly: false,
  },
  worker: {
    seeRevenue: false,
    seeCosts: false,
    manageTeam: false,
    assignedOnly: true,
  },
};

function getRoleScoping(role) {
  return ROLE_SCOPING[role] || ROLE_SCOPING.worker;
}

module.exports = { getRoleScoping, ROLE_SCOPING };
