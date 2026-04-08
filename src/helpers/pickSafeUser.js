const pickSafeUser = (user) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  phone: user.phone || null,
  preferredCategories: user.preferredCategories || [],
  preferredSubcategories: user.preferredSubcategories || [],
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export default pickSafeUser;
