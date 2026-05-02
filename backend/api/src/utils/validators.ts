export const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

export const validatePassword = (password: string) => {
    return password && password.length >= 6;
};

export const validateOrderInput = (quantity: number, price?: number, type?: string) => {
    if (!Number.isInteger(quantity) || quantity <= 0) return false;
    if (type === 'limit' && (price === undefined || price <= 0)) return false;
    return true;
};
