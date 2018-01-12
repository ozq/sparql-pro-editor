var queryHistoryLocalRepository = new QueryHistoryLocalRepository();
var queryLeavingConfirmation = new QueryLeavingConfirmation('#queryLeavingConfirmation');
var wsparqlService = new WSparql({
    'sparqlFormatter': new SparqlFormatter()
});
var commonPrefixes = new CommonPrefixes(editor);
var sparqlFormatter = new SparqlFormatter({
    indentLength: editor.indentLength
});
var queryListManager = new QueryListManager(queryLeavingConfirmation);
var localQueryList = new QueryList('#local-query-list', new QueriesLocalRepository(queryHistoryLocalRepository), editor);
queryListManager.manage(localQueryList);
if (appConfig.isBackendInstalled) {
    var sharedQueryList = new SharedQueryList('#shared-query-list', new QueriesSharedRepository(queryHistoryLocalRepository), editor);
    queryListManager.manage(sharedQueryList);
}

if (appConfig.isBackendInstalled) {
    var sharedQuery = sharedQueryList.repository.get(QueryShare.getSharedQueryId());
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

if (!appConfig.isBackendInstalled) {
    $('[data-ability=backend]').attr('disabled', 'disabled').attr('title', 'This function available only on full version');
    $('#shared-query-list').hide();
}

var isWSparqlEnabled = localStorage.getItem('spe.isWSparqlEnabled');
if (isWSparqlEnabled === 'true') {
    $('#buttonEnableWSparql').prop('checked', true);
}

$('#buttonAddLocalQuery').click(function() {
    var newItem = {
        query: ''
    };
    var newItemId = queryListManager.addItem(localQueryList, newItem);
    queryListManager.selectItem(localQueryList, newItemId);
});
$('#buttonDeleteLocalQuery').click(function() {
    queryListManager.deleteItem(localQueryList, localQueryList.getActiveItemId());
});
$('#buttonSaveLocalQuery').click(function() {
    queryListManager.saveItem(localQueryList);
});

$('#buttonDeleteSharedQuery').click(function() {
    queryListManager.deleteItem(sharedQueryList, sharedQueryList.getActiveItemId());
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

function getAllPrefixes() {
    return Object.assign({}, commonPrefixes.getArray(), editor.getPrefixesFromQuery());
}
$('#buttonExpand').click(function() {
    var expandedUriContent = sparqlFormatter.expandUri(editor.getValue(), getAllPrefixes());
    editor.setValue(expandedUriContent);
});
$('#buttonCompact').click(function() {
    var compactedUriContent = sparqlFormatter.compactUri(editor.getValue(), getAllPrefixes());
    editor.setValue(compactedUriContent);
});

$('#buttonShowSpCompactedView').click(function() {
    var isChecked = $(this).is(':checked');
    if (isChecked) {
        showSpCompactedView();
    }
    toggleEditorCopy(isChecked);
});

$('#buttonClearCommonPrefixes').click(function() {
    commonPrefixes.getTextArea().value = '';
    commonPrefixes.setData('');
});
$('#buttonSaveCommonPrefixes').click(function() {
    commonPrefixes.setData(commonPrefixes.getTextArea().value.split('\n'));
});

$('#buttonSaveAndLeaveCurrentQuery').click(function() {
    queryListManager.saveItem();
    queryListManager.selectItem(null, queryLeavingConfirmation.getNextQueryId());
});
$('#buttonLeaveCurrentQuery').click(function() {
    queryListManager.selectItem(null, queryLeavingConfirmation.getNextQueryId(), true);
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
    editor.setValue(localStorage.getItem('spe.contentWithoutSingleton'));
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

    QueryShare.share(sharedQueryId);
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
    var groupedTripleData = sparqlFormatter.getGroupedTripleData(editorContent);
    var predicatesAndObjects = groupedTripleData.predicates.concat(groupedTripleData.objects);
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

        var afterSelectClause = false;
        var replacedVariablesMarks = [];
        for (var i = 0; i < lineCount; i++) {
            var currentString = contentLines[i];
            var matchingReplacedVariable = replacedVariables[0];

            var openedOperatorRegexp = new RegExp('\{', 'i');
            if (matchingReplacedVariable) {
                //TODO: simplified after select-clause checking!
                if (!afterSelectClause) {
                    if (openedOperatorRegexp.test(currentString)) {
                        afterSelectClause = true;
                    }
                }

                if (afterSelectClause) {
                    var predicateRegexp = new RegExp(_.escapeRegExp(matchingReplacedVariable.predicate), 'gi');
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

/**
 * Insert content at current cursor position
 * @param editor
 * @param str
 */
function insertString(editor, str) {
    var selection = editor.getSelection();
    if(selection.length>0){
        editor.replaceSelection(str);
    }
    else{
        var doc = editor.getDoc();
        var cursor = doc.getCursor();
        var pos = {
            line: cursor.line,
            ch: cursor.ch
        };
        doc.replaceRange(str, pos);
    }
}

/**
 * Property autocomplete (ctrl+space handler)
 */
function autocompletePredicate() {
    var sparqlClient = new SparqlClient({
        graphIri: queryExectuionForm.getGraphIri(),
        requestUrl: queryExectuionForm.getEndpoint(),
        requestType: 'POST',
        requestDataType: 'jsonp',
        debugMode: 'on',
        responseFormat: 'json',
    });

    // Define select
    var autocompleteSelect = $('select[name="predicate-autocomplete"]');
    autocompleteSelect.empty();

    // Define current subject
    var currentSubject = sparqlFormatter.getFirstVariable(editor.doc.getLine(editor.getCursor().line));
    if (currentSubject === null) {
        $.notify('<strong>Subject for autocomplete not found!</strong><br>', { type: 'warning', placement: { from: 'bottom', align: 'right' } });
        return false;
    } else {
        // Build query
        var queryData = sparqlFormatter.buildPredicatesChain(getEditorValue(), currentSubject);
        var query = sparqlFormatter.addSingletonProperties(sparqlFormatter.expandUri(sparqlFormatter.buildQueryByPredicatesChain(queryData), getAllPrefixes()));

        console.log('Autocomplete query:');
        console.log(query);

        // Validate request params
        if (_.isEmpty(sparqlClient.requestUrl) || _.isEmpty(sparqlClient.graphIri)) {
            $.notify('<strong>Endpoint and Graph IRI must be defined!</strong><br>', { type: 'warning', placement: { from: 'bottom', align: 'right' } });
            return false;
        }

        // Get autocomplete items and fill the select
        sparqlClient.execute(
            query,
            function (data) {
                var autocompleteItems = data.results.bindings;
                if (!_.isEmpty(autocompleteItems)) {
                    var options = '';
                    _.forEach(autocompleteItems, function(item) {
                        options += '<option value="'+ item.property.value + '">' + item.label.value + ' (' + item.property.value + ')' + '</option>';
                    });
                    autocompleteSelect.append(options);
                } else {
                    $.notify('<strong>Properties not found!</strong><br>', { type: 'warning', placement: { from: 'bottom', align: 'right' } });
                }
            },
            function (data) {
                console.log(data);
            }
        );
    }
}

$('#buttonAutocompletePredicate').click(function(e) {
    autocompletePredicate();
});
document.addEventListener("keydown", function (zEvent) {
    if (zEvent.ctrlKey  &&  zEvent.keyCode === 32) {
        autocompletePredicate();
    }
});

/**
 * Handle autocomplete select changing
 */
$('select[name="predicate-autocomplete"]').change(function(e) {
    insertString(editor, '<' + $(this).val() + '>');
});

$('#buttonEnableWSparql').click(function(e) {
    var isWSparqlEnabled = $(this).is(':checked');
    console.log(isWSparqlEnabled);
    localStorage.setItem('spe.isWSparqlEnabled', isWSparqlEnabled);
});

$('#buttonToWsparql').click(function() {
    editor.setValue(wsparqlService.toWSparql(editor.getValue()));
});
