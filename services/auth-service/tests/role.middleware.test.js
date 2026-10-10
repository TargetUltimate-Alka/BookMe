// Unit test for the role-authorization middleware, isolated from the DB.
const authorizeRoles = require('../src/middleware/role.middleware');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authorizeRoles middleware', () => {
  test('allows a matching role through', () => {
    const req = { user: { id: '1', role: 'CUSTOMER' } };
    const res = mockRes();
    const next = jest.fn();
    authorizeRoles('CUSTOMER')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('blocks customer from an admin-only route', () => {
    const req = { user: { id: '1', role: 'CUSTOMER' } };
    const res = mockRes();
    const next = jest.fn();
    authorizeRoles('ADMIN')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('allows vendor on a vendor-only route', () => {
    const req = { user: { id: '1', role: 'VENDOR' } };
    const res = mockRes();
    const next = jest.fn();
    authorizeRoles('VENDOR')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('allows admin on an admin-only route', () => {
    const req = { user: { id: '1', role: 'ADMIN' } };
    const res = mockRes();
    const next = jest.fn();
    authorizeRoles('ADMIN')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('rejects when not authenticated at all', () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();
    authorizeRoles('CUSTOMER')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
