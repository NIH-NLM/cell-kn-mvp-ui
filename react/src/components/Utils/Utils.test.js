import {fetchCollections, parseCollections} from "./Utils";

describe('fetchCollections', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should fetch correctly', async () => {
    const fakeData = { data: 'test' };
    const mockJson = jest.fn().mockResolvedValue(fakeData);
    // Mock fetch for ok response
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: mockJson,
    });

    const result = await fetchCollections();

    expect(global.fetch).toHaveBeenCalledWith('/arango_api/collections/');
    expect(result).toEqual(fakeData);
  });

  it('should throw an error when the response is not ok', async () => {
    // Mock fetch for failed response
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
    });

    await expect(fetchCollections()).rejects.toThrow('Network response was not ok');
  });
});

describe('parseCollections', () => {
  it('should sort collections alphabetically in a case-insensitive manner', () => {
    const unsortedCollections = ['banana', 'Apple', 'cherry'];
    const sortedCollections = parseCollections(unsortedCollections);
    expect(sortedCollections).toEqual(['Apple', 'banana', 'cherry']);
  });

  it('should return an empty array when given an empty array', () => {
    expect(parseCollections([])).toEqual([]);
  });

  it('should not change the order if the array is already sorted', () => {
    const sortedArray = ['Apple', 'banana', 'cherry'];
    expect(parseCollections(sortedArray)).toEqual(sortedArray);
  });
});


