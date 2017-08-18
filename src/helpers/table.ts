var handsontable = require('./lib/handsontablep/dist/handsontable.full.js');
declare var WalkontableCellCoords;

export default class TableHelper {
    hot: any;
    
    inputSearch: any;
    document: any;
    
    currentResult: number;    
    queryResult: any;
    lastQuery: any;
    lastSelectedResult: any;    
    isSearching: boolean;
    
    documentSearchKeyupListener: any;
    inputSearchKeyupListener: any;
    afterSelectionHook: any;
    updateCountHook: any;

    constructor(hot, inputSearch) {
        this.hot = hot;
        this.inputSearch = inputSearch;
        this.currentResult = 0;
        this.lastQuery = null;
        this.lastSelectedResult = null;
        
        let that = this;
        let searchTimeout: any = -1;

        this.inputSearchKeyupListener = function (event) {
            // esc
            if (event.keyCode === 27) {
                inputSearch.blur();
                hot.listen();
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            if (that.lastQuery == this.value)
                return;

            if (searchTimeout != -1)
                clearTimeout(searchTimeout);

            searchTimeout = setTimeout(function () {
                that.lastQuery = inputSearch.value;
                that.currentResult = 0;
                that.queryResult = hot.search.query(inputSearch.value);
                hot.render();
                that.lastSelectedResult = null;
                searchTimeout = -1;
            }, 200);
        }

        handsontable.Dom.addEvent(inputSearch, 'keyup', this.inputSearchKeyupListener);
    }

    search() {
        if (this.queryResult && this.queryResult.length) {
            var firstResult = this.queryResult[this.currentResult];
            this.hot.selection.setRangeStart(new WalkontableCellCoords(firstResult.row, firstResult.col));
            this.hot.selection.setRangeEnd(new WalkontableCellCoords(firstResult.row, firstResult.col));
            this.lastSelectedResult = firstResult;
            this.inputSearch.focus();
            this.currentResult += 1;
            if (this.currentResult == this.queryResult.length)
                this.currentResult = 0;
        }
        return false;
    }

    setIsSearching(isSearching) {
        this.isSearching = isSearching;
    }

    initializeTableSearch(document, isActiveHot) {
        let that = this;
        this.document = document;

        this.documentSearchKeyupListener = function (e) {
            if (isActiveHot && isActiveHot())
                return;
            //ctrl+f
            if (e.ctrlKey && e.keyCode == 70) {
                e.preventDefault();
                e.stopPropagation();
                that.inputSearch.select();
                that.hot.unlisten();
            }
        }
        document.addEventListener('keyup', this.documentSearchKeyupListener, false);
        return this;
    }

    initializeTableSelected(hot, index, spanSelected) {
        let lastText = null;        
        this.afterSelectionHook = function (r, c, r2, c2) {
            let s = hot.getSelected();
            if (!s)
                return;

            r = s[0];
            let data = hot.getDataAtRow(r);
            let text = "";
            if (data)
                text = data[index];
            if (text == lastText)
                return;
            spanSelected.innerHTML = lastText = text;
        }        
        handsontable.hooks.add('afterSelection', this.afterSelectionHook);
    }

    initializeTableCount(hot, spanCount) {
        //bug on first call 
        let firstCall = true;
        this.updateCountHook = function () {
            let all = hot.getSourceData().length;
            let filtered = hot.getData().length;
            let text = all;
            if (!firstCall && all != filtered) {
                text = filtered + " dari " + all;
            }
            spanCount.innerHTML = text;
            firstCall = false;
        }

        handsontable.hooks.add('afterLoadData', this.updateCountHook);
        handsontable.hooks.add('afterFilter', this.updateCountHook);
        handsontable.hooks.add('afterChange', this.updateCountHook);
        handsontable.hooks.add('afterRemoveRow', this.updateCountHook);
    }

    removeListenerAndHooks() {
        if (this.inputSearchKeyupListener)
            handsontable.Dom.removeEvent(this.inputSearch, 'keyup', this.inputSearchKeyupListener);
        if (this.documentSearchKeyupListener)
            this.document.removeEventListener('keyup', this.documentSearchKeyupListener, false);
        if (this.afterSelectionHook)
            handsontable.hooks.remove('afterSelection', this.afterSelectionHook);
        if (this.updateCountHook) {
            handsontable.hooks.remove('afterLoadData', this.updateCountHook);
            handsontable.hooks.remove('afterFilter', this.updateCountHook);
            handsontable.hooks.remove('afterChange', this.updateCountHook);
            handsontable.hooks.remove('afterRemoveRow', this.updateCountHook);
        }
    }
}