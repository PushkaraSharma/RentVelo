export const documentDirectory = 'file:///mock_document_dir/';
export const cacheDirectory = 'file:///mock_cache_dir/';

export const makeDirectoryAsync = jest.fn();
export const copyAsync = jest.fn();
export const deleteAsync = jest.fn();
export const getInfoAsync = jest.fn().mockResolvedValue({ exists: true });
export const readDirectoryAsync = jest.fn().mockResolvedValue([]);
