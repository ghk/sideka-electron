describe('DataFilter', function() {
  function columnDataMock(column) {
    var data = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
    ];

    return data[column];
  }

  it('should initialize with dependencies', function() {
    var formulaCollectionMock = {};
    var dataFilter = new Handsontable.utils.FiltersDataFilter(formulaCollectionMock, columnDataMock);

    expect(dataFilter.formulaCollection).toBe(formulaCollectionMock);
    expect(dataFilter.columnDataFactory).toBe(columnDataMock);
  });

  describe('filter', function() {
    it('should not filter input data when formula collection is empty', function() {
      var formulaCollectionMock = {isEmpty: jasmine.createSpy('isEmpty').andReturn(true)};
      var dataFilter = new Handsontable.utils.FiltersDataFilter(formulaCollectionMock, columnDataMock);

      dataFilter.filter();

      expect(formulaCollectionMock.isEmpty).toHaveBeenCalled();
    });

    it('should filter input data based on formula collection (shallow filtering)', function() {
      var formulaCollectionMock = {
        isEmpty: jasmine.createSpy('isEmpty').andReturn(false),
        orderStack: [0] // filtering applied to column index 0
      };
      var dataFilter = new Handsontable.utils.FiltersDataFilter(formulaCollectionMock, columnDataMock);

      spyOn(dataFilter, 'columnDataFactory').andCallThrough();
      spyOn(dataFilter, '_getIntersectData').andCallThrough();
      spyOn(dataFilter, 'filterByColumn').andReturn([1, 2]);

      var result = dataFilter.filter();

      expect(dataFilter.columnDataFactory).toHaveBeenCalledWith(0);
      expect(dataFilter._getIntersectData).not.toHaveBeenCalled();
      expect(dataFilter.filterByColumn).toHaveBeenCalledWith(0, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(result).toEqual([1, 2]);
    });

    it('should filter input data based on formula collection (deep filtering)', function() {
      var formulaCollectionMock = {
        isEmpty: jasmine.createSpy('isEmpty').andReturn(false),
        orderStack: [1, 0] // filtering applied first to column at index 1 and later at index 0
      };
      var dataFilter = new Handsontable.utils.FiltersDataFilter(formulaCollectionMock, columnDataMock);

      spyOn(dataFilter, 'columnDataFactory').andCallThrough();
      spyOn(dataFilter, '_getIntersectData').andReturn([1, 2])
      spyOn(dataFilter, 'filterByColumn').andReturn([1, 2]);

      var result = dataFilter.filter();

      expect(dataFilter.columnDataFactory).toHaveBeenCalledWith(0);
      expect(dataFilter._getIntersectData).toHaveBeenCalledWith([1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2]);
      expect(dataFilter.filterByColumn.calls[0].args).toEqual([1, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']]);
      expect(dataFilter.filterByColumn.calls[1].args).toEqual([0, [1, 2]]);
      expect(result).toEqual([1, 2]);
    });
  });

  describe('filterByColumn', function() {
    it('should filter input data based on formula collection (filter all)', function() {
      var formulaCollectionMock = {
        isMatch: jasmine.createSpy('isMatch').andCallFake(function() {
          return true;
        }),
      };
      var dataFilter = new Handsontable.utils.FiltersDataFilter(formulaCollectionMock, columnDataMock);
      var data = [1, 2, 3, 4, 5];

      var result = dataFilter.filterByColumn(0, data);

      expect(formulaCollectionMock.isMatch.calls.length).toBe(5);
      expect(formulaCollectionMock.isMatch.calls[0].args).toEqual([1, 0]);
      expect(formulaCollectionMock.isMatch.calls[1].args).toEqual([2, 0]);
      expect(formulaCollectionMock.isMatch.calls[2].args).toEqual([3, 0]);
      expect(formulaCollectionMock.isMatch.calls[3].args).toEqual([4, 0]);
      expect(formulaCollectionMock.isMatch.calls[4].args).toEqual([5, 0]);
      expect(result).toEqual(data);
    });

    it('should filter input data based on formula collection (filter none)', function() {
      var formulaCollectionMock = {
        isMatch: jasmine.createSpy('isMatch').andCallFake(function() {
          return false;
        }),
      };
      var dataFilter = new Handsontable.utils.FiltersDataFilter(formulaCollectionMock, columnDataMock);
      var data = [1, 2, 3, 4, 5];

      var result = dataFilter.filterByColumn(0, data);

      expect(formulaCollectionMock.isMatch.calls.length).toBe(5);
      expect(formulaCollectionMock.isMatch.calls[0].args).toEqual([1, 0]);
      expect(formulaCollectionMock.isMatch.calls[1].args).toEqual([2, 0]);
      expect(formulaCollectionMock.isMatch.calls[2].args).toEqual([3, 0]);
      expect(formulaCollectionMock.isMatch.calls[3].args).toEqual([4, 0]);
      expect(formulaCollectionMock.isMatch.calls[4].args).toEqual([5, 0]);
      expect(result).toEqual([]);
    });

    it('should filter input data based on formula collection (filtering odd numbers)', function() {
      var formulaCollectionMock = {
        isMatch: jasmine.createSpy('isMatch').andCallFake(function(dataRow, column) {
          return dataRow % 2;
        }),
      };
      var dataFilter = new Handsontable.utils.FiltersDataFilter(formulaCollectionMock, columnDataMock);
      var data = [1, 2, 3, 4, 5];

      var result = dataFilter.filterByColumn(0, data);

      expect(formulaCollectionMock.isMatch.calls.length).toBe(5);
      expect(formulaCollectionMock.isMatch.calls[0].args).toEqual([1, 0]);
      expect(formulaCollectionMock.isMatch.calls[1].args).toEqual([2, 0]);
      expect(formulaCollectionMock.isMatch.calls[2].args).toEqual([3, 0]);
      expect(formulaCollectionMock.isMatch.calls[3].args).toEqual([4, 0]);
      expect(formulaCollectionMock.isMatch.calls[4].args).toEqual([5, 0]);
      expect(result).toEqual([1, 3, 5]);
    });
  });
});
