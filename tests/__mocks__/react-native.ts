export const Platform = {
    OS: 'ios',
    select: jest.fn((objs) => objs.ios),
};
export const Alert = {
    alert: jest.fn()
};
