export const money = (value: number) => value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
