var Handsontable = require('./handsontablep/dist/handsontable.full.js');

class TableSearcher {
    constructor(hot, inputSearch) {
        this.hot = hot;
        this.inputSearch = inputSearch;
        
        //this.queryResult = n
        this.currentResult = 0;
        this.lastQuery = null;
        this.lastSelectedResult = null;
        var that = this;
        
        var searchTimeout = -1;
        
        Handsontable.Dom.addEvent(inputSearch, 'keyup', function(event) {
            if (event.keyCode === 27){
                inputSearch.blur();
                hot.listen();
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            if(that.lastQuery == this.value)
                return;
                
            if(searchTimeout != -1)
                clearTimeout(searchTimeout);
                
            searchTimeout = setTimeout(function(){
                that.lastQuery = inputSearch.value;
                that.currentResult = 0;
                that.queryResult = hot.search.query(inputSearch.value);
                hot.render();
                that.lastSelectedResult = null;
                searchTimeout = -1;
            }, 200);
        });

    }
    
    search(){
        if(this.queryResult && this.queryResult.length){
            var firstResult = this.queryResult[this.currentResult];
            this.hot.selection.setRangeStart(new WalkontableCellCoords(firstResult.row,firstResult.col));
            this.hot.selection.setRangeEnd(new WalkontableCellCoords(firstResult.row,firstResult.col));
            this.lastSelectedResult = firstResult;
            this.inputSearch.focus();
            this.currentResult += 1;
            if(this.currentResult == this.queryResult.length)
                this.currentResult = 0;
        }
        return false;
    }
    
    setIsSearching(isSearching){
        this.isSearching = isSearching;
    }
}

export function initializeTableSearch(hot, document, inputSearch, isActiveHot){
    var tableSearcher =  new TableSearcher(hot, inputSearch);
    function keyup(e) {
        if(isActiveHot && !isActiveHot())
            return;
        //ctrl+f
        if (e.ctrlKey && e.keyCode == 70){
            e.preventDefault();
            e.stopPropagation();
            inputSearch.select();
            hot.unlisten();
        }
    }
    document.addEventListener('keyup', keyup, false);
    return tableSearcher;
}

export function initializeTableSelected(hot, index, spanSelected){
    var lastText = null;
    Handsontable.hooks.add('afterSelection', function(r, c, r2, c2) {
        var s = hot.getSelected();
        r = s[0];
        var data = hot.getDataAtRow(r);
        var text = "";
        if(data){
            text = data[index];
        }
        if(text == lastText)
            return;
        spanSelected.innerHTML = lastText = text;
    });
} 

export function initializeTableCount(hot, spanCount){
    //bug on first call 
    var firstCall = true; 
    var updateCount = function(){
            var all = hot.getSourceData().length;
            var filtered = hot.getData().length;
            var text = all;
            if(!firstCall && all != filtered){
                text = filtered + " dari " + all;
            }
            spanCount.innerHTML = text;
            firstCall = false; 
    }
    
    Handsontable.hooks.add('afterLoadData', function(changes, source) {
            updateCount();
    });
    Handsontable.hooks.add('afterFilter', function() {
            updateCount();
    });
    Handsontable.hooks.add('afterRemoveRow', function() {
            updateCount();
    });    
} 