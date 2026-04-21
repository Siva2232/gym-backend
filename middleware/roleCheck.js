/**
 * Role-based access control middleware
 * @param {...string} roles - Allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }

    next();
  };
};

/**
 * Ensure the trainer can only access their own customers
 */
export const trainerOwnership = async (req, res, next) => {
  const { user } = req;

  if (user.role === 'admin') return next(); // Admins bypass

  if (user.role === 'trainer') {
    // The target customerId must be provided in params, query, or body
    const targetCustomerId =
      req.params.customerId || req.body.customerId || req.query.customerId;

    if (targetCustomerId) {
      const User = (await import('../models/User.js')).default;
      const customer = await User.findById(targetCustomerId);

      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      if (customer.trainerId?.toString() !== user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Not your customer',
        });
      }
    }
    return next();
  }

  if (user.role === 'customer') {
    // Customers can only access their own data
    const targetId = req.params.customerId || req.params.id;
    if (targetId && targetId !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Can only access your own data',
      });
    }
    return next();
  }

  next();
};

/**
 * Ensure same gymId across requests
 */
export const gymIsolation = (req, res, next) => {
  const { user } = req;
  const reqGymId = req.params.gymId || req.body.gymId || req.query.gymId;

  if (reqGymId && user.gymId?._id?.toString() !== reqGymId && user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cross-gym access not permitted',
    });
  }

  // Inject gymId into request body for creation operations
  if (req.method === 'POST' || req.method === 'PUT') {
    req.body.gymId = req.body.gymId || user.gymId?._id || user.gymId;
  }

  next();
};
