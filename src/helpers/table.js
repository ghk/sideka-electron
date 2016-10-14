var Handsontable = require('./handsontablep/dist/handsontable.full.js');

export function initializeTableSearch(hot, document, formSearch, inputSearch){
    var queryResult;
    var currentResult = 0;
    var lastQuery = null;
    var lastSelectedResult = null;

    Handsontable.Dom.addEvent(inputSearch, 'keyup', function(event) {
        if (event.keyCode === 27){
            inputSearch.blur();
            hot.listen();
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        if(lastQuery == this.value)
            return;
            
        lastQuery = this.value;
        currentResult = 0;
        queryResult = hot.search.query(this.value);
        hot.render();
        lastSelectedResult = null;
    });
    
    function keyup(e) {
        //ctrl+f
        if (e.ctrlKey && e.keyCode == 70){
            e.preventDefault();
            e.stopPropagation();
            inputSearch.select();
            hot.unlisten();
        }
    }
    document.addEventListener('keyup', keyup, false);

    formSearch.onsubmit = function(){
        if(queryResult && queryResult.length){
            var firstResult = queryResult[currentResult];
            hot.selection.setRangeStart(new WalkontableCellCoords(firstResult.row,firstResult.col));
            hot.selection.setRangeEnd(new WalkontableCellCoords(firstResult.row,firstResult.col));
            lastSelectedResult = firstResult;
            inputSearch.focus();
            currentResult += 1;
            if(currentResult == queryResult.length)
                currentResult = 0;
        }
        return false;
    };
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
} 