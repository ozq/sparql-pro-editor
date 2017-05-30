initCommonPrefixesData();
var queryExectuionForm = new QueryExecutionForm('#formExecuteQuery', '#selectQuerySettings', new QuerySettingsRepository());

var queryListManager = new QueryListManager();
var localQueryList = new QueryList('#local-query-list', new QueriesLocalRepository(), editor);
queryListManager.manage(localQueryList);
if (appConfig.isBackendInstalled) {
    var sharedQueryList = new QueryList('#shared-query-list', new QueriesSharedRepository(), editor);
    queryListManager.manage(sharedQueryList);
}

if (appConfig.isBackendInstalled) {
    $.urlParam = function(name) {
        var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        return results ? results[1] || 0 : null;
    };
    var sharedQueryId = $.urlParam('sharedQueryId');
    var sharedQuery = sharedQueryList.repository.get(sharedQueryId);
    if (sharedQuery) {
        var listItem = queryListManager.getListElementById(sharedQueryList, sharedQuery.id);
        if (listItem) {
            queryListManager.selectItem(sharedQueryList, sharedQuery.id, true)
        } else {
            queryListManager.addItem(sharedQueryList, sharedQuery, true, false);
            queryListManager.selectItem(sharedQueryList, sharedQuery.id, true)
        }
    } else {
        queryListManager.selectDefaultItem();
    }
} else {
    queryListManager.selectDefaultItem();
}

var sparqlFormatter = new SparqlFormatter({
    indentLength: editor.indentLength
});

function getQueryPrefixes() {
    return editor.getPrefixesFromQuery();
}

function getAllPrefixes() {
    return Object.assign({}, getCommonPrefixesArray(), getQueryPrefixes());
}

if (!appConfig.isBackendInstalled) {
    $('[data-ability=backend]').attr('disabled', 'disabled').attr('title', 'This function available only on full version');
}

$('#buttonAddLocalQuery').click(function() {
    var newItem = {
        query: ''
    };
    var newItemId = queryListManager.addItem(localQueryList, newItem);
    queryListManager.selectItem(localQueryList, newItemId);
});
$('#buttonDeleteLocalQuery').click(function() {
    queryListManager.deleteItem(localQueryList, localQueryList.getSelectedId());
});
$('#buttonSaveLocalQuery').click(function() {
    queryListManager.saveItem(localQueryList);
});

$('#buttonDeleteSharedQuery').click(function() {
    queryListManager.deleteItem(sharedQueryList, sharedQueryList.getSelectedId());
});
$('#buttonSaveSharedQuery').click(function() {
    queryListManager.saveItem(sharedQueryList)
});

$('#buttonBeautify').click(function() {
    var beautifiedContent = sparqlFormatter.beautify(editor.getValue());
    editor.setValue(beautifiedContent);
});
$('#buttonRemoveMinus').click(function() {
    var contentWithoutMinus = sparqlFormatter.removeAllOperatorsByName(editor.getValue(), 'minus');
    editor.setValue(contentWithoutMinus);
});
$('#buttonExpand').click(function() {
    var expandedUriContent = sparqlFormatter.expandUri(editor.getValue(), getAllPrefixes());
    editor.setValue(expandedUriContent);
});
$('#buttonCompact').click(function() {
    var compactedUriContent = sparqlFormatter.compactUri(editor.getValue(), getAllPrefixes());
    editor.setValue(compactedUriContent);
});

$('#buttonClearCommonPrefixes').click(function() {
    getCommonPrefixesTextArea().value = '';
    setCommonPrefixesData('');
});
$('#buttonSaveCommonPrefixes').click(function() {
    setCommonPrefixesData(getCommonPrefixesTextArea().value.split('\n'));
});

$('#buttonSaveAndLeaveCurrentQuery').click(function() {
    queryListManager.saveItem();
    queryListManager.selectItem(null, QueryLeavingConfirmation.getNextQueryId());
});
$('#buttonLeaveCurrentQuery').click(function() {
    queryListManager.selectItem(null, QueryLeavingConfirmation.getNextQueryId(), true);
});
$('#buttonCancelQueryLeaving').click(function() {
    return true;
});

$('#buttonRemoveSingleton').click(function () {
    var removeSingletonResult = sparqlFormatter.removeSingletonProperties(editor.getValue());

    if (removeSingletonResult.deleted_uri.length > 0) {
        localStorage.setItem('spe.contentWithoutSingleton', removeSingletonResult.result);
        var confirmationElement = $('#deletingSpUriConfirmation');
        confirmationElement.find('.uri-list').text(removeSingletonResult.deleted_uri);
        confirmationElement.modal('show');
    } else {
        editor.setValue(removeSingletonResult.result);
    }
});
$('#buttonDeleteSpUri').click(function () {
    editor.setValue(sparqlFormatter.beautify(localStorage.getItem('spe.contentWithoutSingleton')));
});
$('#buttonAddSingleton').click(function() {
    var addSingletonResult = sparqlFormatter.addSingletonProperties(editor.getValue());
    editor.setValue(addSingletonResult);
});

$('#buttonShowQueryResult').click(function() {
    $('#queryExecutionResult').modal('show');
});

$('#buttonShareQuery').click(function() {
    var item = {
        name: queryListManager.getSelectedItemName(),
        query: editor.getValue(),
        default_graph_uri: $('.query-execution').find('input[name="default_graph_uri"]').val(),
        endpoint: $('.query-execution').find('input[name="endpoint"]').val()
    };
    var sharedQueryId = queryListManager.addItem(sharedQueryList, item);

    var temp = $('<input>');
    $('body').append(temp);
    var sharedUrl = window.location.origin + window.location.pathname + '?' + $.param({sharedQueryId: sharedQueryId});
    temp.val(sharedUrl).select();
    document.execCommand('copy');
    temp.remove();
});

$(document).on('keydown', function(e){
    if (e.ctrlKey && e.which === 83){
        queryListManager.saveItem();
    }
});

markedUndefinedVariables = [];
function markUndefinedVariables() {
    var editorContent = editor.getValue();
    var needUndefinedVariablesChecking = editorContent.search(/}/) > -1 && editorContent.search(/where/i) > -1;

    if (markedUndefinedVariables.length) {
        markedUndefinedVariables.forEach(function(mark) {
            mark.clear();
        });
    }

    if (needUndefinedVariablesChecking) {
        var undefinedVariables = sparqlFormatter.getUndefinedVariables(editor.getValue());
        if (undefinedVariables.length) {
            undefinedVariables.forEach(function(variable) {
                var mark = editor.getDoc().markText({
                    line: variable.line,
                    ch: variable.startIndex
                }, {
                    line: variable.line,
                    ch: variable.endIndex
                }, {
                    className: 'marked-text-error',
                    title: 'Variable ' + variable.variable + ' is used in the query result set but not assigned'
                });
                markedUndefinedVariables.push(mark);
            });
        }
    }
}

markedVariablesWitoutParents = [];
function markVariablesWithoutParents() {
    var editorContent = editor.getValue();
    var predicatesAndObjects = sparqlFormatter.getAllPredicatesAndObjects(editorContent);
    var contentLines = editorContent.split('\n');
    var lineCount = contentLines.length;
    var lineVariablesRegexp = new RegExp(sparqlFormatter.variablesRegexpCode, 'g');
    var variablesWithoutParents = [];
    var inWhereClause = false;

    if (markedVariablesWitoutParents.length) {
        markedVariablesWitoutParents.forEach(function(mark) {
            mark.clear();
        });
    }

    for (var i = 0; i < lineCount; i++) {
        var currentString = contentLines[i];

        //TODO: this algorithm isn't consider nested SELECT/WHERE pairs
        //TODO: some variables in nested SELECT clause will marked
        if (inWhereClause === false) {
            var whereClausePosition = currentString.search(/where/i);
            if (whereClausePosition > -1) {
                inWhereClause = true;
                lineVariablesRegexp.lastIndex = whereClausePosition;
            }
        }

        if (inWhereClause === true) {
            var lineVariables = [];
            while (lineVariables = lineVariablesRegexp.exec(currentString)) {
                if (_.indexOf(predicatesAndObjects, lineVariables[0]) === -1) {
                    var variable = {
                        variable: lineVariables[0],
                        line: i,
                        startIndex: lineVariables.index,
                        endIndex: lineVariablesRegexp.lastIndex
                    };
                    variablesWithoutParents.push(variable);
                }
            }
        }
    }

    variablesWithoutParents.forEach(function(variable) {
        if (editor.findMarksAt({line: variable.line, ch: variable.startIndex}).length === 0) {
            var mark = editor.getDoc().markText({
                line: variable.line,
                ch: variable.startIndex
            }, {
                line: variable.line,
                ch: variable.endIndex
            }, {
                className: 'marked-text-warning',
                title: 'Variable ' + variable.variable + ' doesn\'t have parent. Check, that it is correct.'
            });
            markedVariablesWitoutParents.push(mark);
        }
    });
}

markUndefinedVariables();
markVariablesWithoutParents();
editor.on('change', function() {
    markUndefinedVariables();
    markVariablesWithoutParents();
});

function toggleEditorCopy(showCopy) {
    if (showCopy) {
        $('.editors .yasqe:last-child').css('z-index', '2');
        $('.editors .yasqe:first-child').css('z-index', '1');
    } else {
        editorCopy.setValue(editor.getValue());
        $('.editors .yasqe:last-child').css('z-index', '1');
        $('.editors .yasqe:first-child').css('z-index', '2');
    }
}

markedReplacedSingletonPoperites = [];
function showSpCompactedView() {
    markedReplacedSingletonPoperites = [];
    // Remove sp properties
    var removeSingletonResult = sparqlFormatter.removeSingletonProperties(editorCopy.getValue(), true);
    editorCopy.setValue(removeSingletonResult.result);

    // Add marks
    var replacedVariables = removeSingletonResult.replaced_variables;
    if (replacedVariables.length) {
        var contentLines = editorCopy.getValue().split('\n');
        var lineCount = contentLines.length;
        var predicates;

        var replacedVariablesMarks = [];
        for (var i = 0; i < lineCount; i++) {
            var currentString = contentLines[i];
            var matchingReplacedVariable = replacedVariables[0];

            if (matchingReplacedVariable) {
                var predicateRegexp = new RegExp(matchingReplacedVariable.predicate, 'gi');
                var isPredicateFound = false;

                while (predicates = predicateRegexp.exec(currentString)) {
                    var replacedVariableMark = {
                        variable: matchingReplacedVariable.variable,
                        line: i,
                        startIndex: predicates.index,
                        endIndex: predicateRegexp.lastIndex
                    };
                    replacedVariablesMarks.push(replacedVariableMark);
                    isPredicateFound = true;
                }

                if (isPredicateFound) {
                    replacedVariables = _.drop(replacedVariables);
                }
            }
        }

        replacedVariablesMarks.forEach(function (markItem) {
            var mark = editorCopy.getDoc().markText({
                line: markItem.line,
                ch: markItem.startIndex
            }, {
                line: markItem.line,
                ch: markItem.endIndex
            }, {
                className: 'marked-text-info',
                title: markItem.variable
            });
            markedReplacedSingletonPoperites.push(mark);
        });
    }
}

$('#buttonShowSpCompactedView').click(function() {
    var isChecked = $(this).is(':checked');
    if (isChecked) {
        showSpCompactedView();
    }
    toggleEditorCopy(isChecked);
});
