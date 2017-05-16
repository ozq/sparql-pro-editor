/** Init Yasqe Editor **/
var editor = YASQE.fromTextArea(
    document.getElementById('yasqe'),
    {
        mode: 'sparql11',
        indentUnit: 4
    }
);

/** Toolbar buttons **/
//TODO: вынести всю логику работы с кнопками в отдельное место [!]
//TODO: создать специальный класс/хэлпер для форматирования sparql-кода (SparqlFormatter)
function deleteIndents()
{
    YASQE.commands['selectAll'](editor);
    editor.indentSelection('prev');
}

function getStringWithIndents(indentDepth, string) {
    return new Array(indentDepth * editor.options.indentUnit).join(' ') + string;
}

function getQueryPrefixes() {
    return editor.getPrefixesFromQuery();
}

function getAllPrefixes() {
    return Object.assign({}, getCommonPrefixesArray(), getQueryPrefixes());
}

function removeAllOperatorsByName(name) {
    var operatorStartIndex = 0;
    var processContent = editor.getValue();
    var operatorRegexp = new RegExp(name + '\\s*{', 'i');

    do {
        // Find operator start index
        operatorStartIndex = processContent.search(operatorRegexp);
        if (operatorStartIndex >= 0) {
            var matchedBracket;
            var bracketsCounter = 0;
            var bracketsRegexp = new RegExp('[{}]', 'g');
            bracketsRegexp.lastIndex = operatorStartIndex;

            // Find operator last bracket index
            while (matchedBracket = bracketsRegexp.exec(processContent)) {
                bracketsRegexp.lastIndex = matchedBracket.index + 1;
                matchedBracket[0] === '{' ? bracketsCounter++ : false;
                matchedBracket[0] === '}' ? bracketsCounter-- : false;
                if (bracketsCounter === 0) {
                    // Replace all content from operator start index to operator last bracket index
                    var operatorContent = processContent.substring(operatorStartIndex, bracketsRegexp.lastIndex);
                    processContent = processContent.replace(operatorContent, '');
                    break;
                }
            }

            // Handle brackets nesting error
            if (bracketsCounter > 0) {
                console.log('SPARQL syntax error, check brackets nesting.');
                break;
            }
        }
    } while (operatorStartIndex >= 0);

    // Update editor content
    editor.setValue(processContent);
}

function expandUri(content, prefixes) {
    Object.keys(prefixes).map(function(prefix) {
        var url = prefixes[prefix];
        var replacedContent = content.replace(new RegExp(prefix + ':(\\w+)', 'gi'), function(match, property) {
            return '<' + url + property + '>';
        });
        replacedContent ? content = replacedContent : false;
    });

    return content;
}

function compactUri(content, prefixes) {
    Object.keys(prefixes).map(function(prefix) {
        var url = prefixes[prefix];
        var replacedContent = content.replace(new RegExp('\<' + url + '(\\w+)\>', 'gi'), function(match, property) {
            return prefix + '\:' + property;
        });
        replacedContent ? content = replacedContent : false;
    });

    return content;
}

$('#buttonBeautify').click(function() {
    deleteIndents();

    var indentDepth = 0;
    var formattedContent = [];
    var lineCount = editor.lineCount();

    for (var i = 0; i < lineCount; i++) {
        var currentString = editor.getLine(i);
        if (currentString.indexOf('{') > -1) {
            currentString = getStringWithIndents(indentDepth, currentString);
            indentDepth++;
        } else {
            if (currentString.indexOf('}') > -1) {
                indentDepth--;
            }
            currentString = getStringWithIndents(indentDepth, currentString);
        }
        formattedContent.push(currentString);
    }

    editor.setValue(formattedContent.join('\r\n'));
});

$('#buttonRemoveMinus').click(function() {
    removeAllOperatorsByName('minus');
});

$('#buttonExpand').click(function() {
    var replacedContent = expandUri(editor.getValue(), getAllPrefixes());
    editor.setValue(replacedContent);
});

$('#buttonCompact').click(function() {
    var replacedContent = compactUri(editor.getValue(), getAllPrefixes());
    editor.setValue(replacedContent);
});

/** Common prefixes logic **/
//TODO: вынести всю логику работы с common prefix в отдельное место [!]
//TODO: валидация вводимых префиксов
//TODO: абстрагироваться от localStorage

function getCommonPrefixesContent()
{
    return JSON.parse(localStorage.getItem('commonPrefixes'));
}

function getCommonPrefixesArray() {
    var commonPrefixesContent = getCommonPrefixesContent();
    var commonPrefixesArray = [];

    if (commonPrefixesContent) {
        commonPrefixesContent.forEach(function(item, i) {
            var prefixData = item.replace(new RegExp('PREFIX\\s*', 'i'), '');
            var matchedPrefixData = prefixData.match(new RegExp('(\\w+):\<(.+)\>'));
            if (matchedPrefixData) {
                commonPrefixesArray[matchedPrefixData[1]] = matchedPrefixData[2];
            }
        });
    }

    return commonPrefixesArray;
}

function getCommonPrefixesTextArea() {
    return document.getElementsByClassName('common-prefixes-textarea')[0];
}

function setCommonPrefixesData(data) {
    localStorage.setItem('commonPrefixes', JSON.stringify(data));
}

function initCommonPrefixesData() {
    var data = getCommonPrefixesContent();
    if (data) {
        getCommonPrefixesTextArea().value = data.join('\n');
    }
}

initCommonPrefixesData();

$('#buttonClearCommonPrefixes').click(function() {
    getCommonPrefixesTextArea().value = '';
    setCommonPrefixesData('');
});
$('#buttonSaveCommonPrefixes').click(function() {
    setCommonPrefixesData(getCommonPrefixesTextArea().value.split('\n'));
});


/** >> Query History **/
function QueryHistory() {
    var storageKey = 'spe.queryHistory';

    this.getAll = function () {
        var items = JSON.parse(localStorage.getItem(storageKey));
        return items ? items : [];
    };

    this.get = function (id) {
        return this.getAll().filter(function(item){ return item.id == id })[0];
    };

    this.generateId = function () {
        return new Date().getTime();
    };

    this.getIndexById = function (id) {
        var ids = this.getAll().map(function(item){return item.id;});
        return ids.indexOf(parseInt(id));
    };

    this.add = function(content, name) {
        var newItem = {
            'id': this.generateId(),
            'name': name ? name : 'New sparql ' + parseInt(this.getAll().length + 1),
            'content': content
        };
        var history = this.getAll();
        history.push(newItem);
        localStorage.setItem(storageKey, JSON.stringify(history));

        return newItem;
    };

    this.put = function (item) {
        var history = this.getAll();
        history[this.getIndexById(item.id)] = item;
        localStorage.setItem(storageKey, JSON.stringify(history));
    };

    this.delete = function (id) {
        var index = this.getIndexById(id);
        var history = this.getAll();
        history.splice(index, 1);
        localStorage.setItem(storageKey, JSON.stringify(history));
    };

    this.setSelectedId = function (id) {
        localStorage.setItem(storageKey + '.selected', id);
    };

    this.getSelectedId = function () {
        return localStorage.getItem(storageKey + '.selected');
    };
}

var queryHistory = new QueryHistory();
var queryHistoryListElement = $('.query-history-list');

function buildHistoryItem(id, name, isNew) {
    var className = "list-group-item " + (isNew ? 'not-saved'  : '');

    return "<a href='#' data-id='" + id + "' class='" + className + "'>" +
               "<span class='queryTitle'>" + name + "</span>" +
               "<span class='glyphicon glyphicon-pencil renameHistoryQuery' aria-hidden='true'>Rename</span>" +
           "</a>" +
           "<div class='querySettings'>" +
               "<input type='text' class='form-control newQueryName' data-id='" + id + "' value='" + name + "' style='display: none;'>" +
           "</div>";
}

function buildHistoryMenu() {
    var menuContent = '';
    var queryHistoryWrapper = $('.query-history-list');

    if (!queryHistory.getAll().length) {
        queryHistory.add('', 'New sparql 1');
    }
    queryHistory.getAll().forEach(function(item) {
        menuContent += buildHistoryItem(item.id, item.name);
    });
    queryHistoryWrapper.html(menuContent);

    var selectedIndex = queryHistory.getSelectedId();
    var selectedId = queryHistory.get(selectedIndex) ? selectedIndex : queryHistory.getAll()[0].id;
    selectQueryHistoryItem(selectedId);
}

function deleteQueryHistoryItem(id) {
    queryHistory.delete(id);
    var selectedItem = $('.query-history-list').find(".list-group-item[data-id='" + id + "']");
    selectedItem.next('.querySettings').remove();
    selectedItem.remove();
    editor.setValue('');
}

function selectQueryHistoryItem(id) {
    var query = queryHistory.get(id);

    var currentSelectedItem = $('.query-history-list .list-group-item.active');
    if (currentSelectedItem.length) {
        var currentSelectedItemId = currentSelectedItem.data('id');
        if (currentSelectedItem.hasClass('not-saved')) {
            var deleteNotSavedQuery = confirm('Save current query?');
            if (deleteNotSavedQuery) {
                saveQueryHistoryItem(currentSelectedItemId);
            } else {
                return;
            }
        }
    }

    if (query) {
        $('.query-history-list .list-group-item').removeClass('active');
        queryHistoryListElement.find(".list-group-item[data-id='" + id + "']").addClass('active');
        editor.setValue(query.content);
        queryHistory.setSelectedId(id);
        editor.setOption('id', id);
    }
}

function saveCurrentQuery() {
    saveQueryHistoryItem(queryHistory.getSelectedId());
}

function saveQueryHistoryItem(id) {
    var selectedItem = queryHistory.get(id);
    selectedItem.content = editor.getValue();
    queryHistory.put(selectedItem);
    queryHistoryListElement.find(".list-group-item[data-id='" + id + "']").removeClass('not-saved');
}

buildHistoryMenu();

window.onbeforeunload = function() {
    if (queryHistoryListElement.find('.list-group-item.not-saved').length) {
        return 'There are some not-saved queries. Do you want to save them?';
    }
};

editor.on('change', function(editor) {
    var selectedId = queryHistoryListElement.find(".list-group-item.active").data('id');
    if (editor.getOption('id') == selectedId) {
        queryHistoryListElement.find(".list-group-item[data-id='" + selectedId + "']").addClass('not-saved');
    }
});

$('.query-history-list').on('click', '.list-group-item', function() {
    if (!$(this).hasClass('active')) {
        selectQueryHistoryItem($(this).data('id'));
    }
});

$('#buttonAddQueryHistory').click(function() {
    var item = queryHistory.add('');
    $('.query-history-list').append(buildHistoryItem(item.id, item.name));
    selectQueryHistoryItem(item.id);
    editor.setValue('');
});

$('#buttonDeleteQueryHistory').click(function() {
    var selectedId = queryHistory.getSelectedId();
    deleteQueryHistoryItem(selectedId);

    var selectingItem = $('.query-history-list').find(".list-group-item").first();
    if (selectingItem) {
        selectQueryHistoryItem(selectingItem.data('id'));
    }
});

$('#buttonSaveQueryHistory').click(function() {
    saveCurrentQuery();
});
$(document).on('keydown', function(e){
    if (e.ctrlKey && e.which === 83){
        saveCurrentQuery();
    }
});

$('.query-history-list').on('click', '.renameHistoryQuery', function() {
    var renameInput = $(this).parent().next('.querySettings').find('.newQueryName');
    renameInput.slideToggle(100).focus();
});

$('.query-history-list').on('keypress', '.newQueryName', function(e) {
    if (e.which == 13){
        var item = queryHistory.get($(this).data('id'));
        item.name = $(this).val();
        queryHistory.put(item);
        $(this).parent().prev('.list-group-item').find('.queryTitle').text($(this).val());
        $(this).slideToggle(100);
    }
});
/** << Query History **/

/** >> Query execution **/
var queryExecutionForm = $('#formExecuteQuery');

function initQueryExecutionForm() {
    var queryParameters = JSON.parse(localStorage.getItem('spe.queryExecution'));
    if (queryParameters) {
        for (var key in queryParameters) {
            var input = queryExecutionForm.find('input[name="' + key + '"]');
            if (input.length) {
                input.val(queryParameters[key]);
            }
        }
    }
}

initQueryExecutionForm();

queryExecutionForm.submit(function(e) {
    e.preventDefault();

    // Send request
    var parameters = {
        'default-graph-uri': $(this).find('input[name="default-graph-uri"]').val(),
        'query': editor.getValue()
    };
    // Save request parameters
    localStorage.setItem('spe.queryExecution', JSON.stringify(parameters));
    // Send request
    //TODO: delete hardcode
    var requestUrl = 'http://draft.adposium.ru:8890/sparql?' + jQuery.param(parameters);
    window.open(encodeURI(requestUrl), '_blank');
});
/** << Query execution **/