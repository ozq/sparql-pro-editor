import SparqlFormatter from '../../node_modules/sparql-core/dist/js/SparqlFormatter';
import SparqlClient from '../../node_modules/sparql-core/dist/js/SparqlClient';
import WSparql from '../../node_modules/sparql-core/dist/js/WSparql';
import AppConfig from './AppConfig';
import QuerySettingsRepository from './QuerySettingsRepository';
import CodeEditor from './CodeEditor';
import QueryHistoryLocalRepository from './QueryHistoryLocalRepository';
import QueryShare from './QueryShare';
import QueryList from './QueryList';
import QueryLeavingConfirmation from './QueryLeavingConfirmation';
import QueryListManager from './QueryListManager';
import CommonPrefixes from './CommonPrefixes';
import SharedQueryList from './SharedQueryList';
import QueriesLocalRepository from './QueriesLocalRepository';
import QueriesSharedRepository from './QueriesSharedRepository';
import QueryExecutionForm from './QueryExecutionForm';

let appConfig = new AppConfig();
let querySettingsRepository = new QuerySettingsRepository;

let sparqlFormatter = new SparqlFormatter({
    additionalPrefixes: {
        'crm2': 'http://sp7.ru/ontology/',
        'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
        'owl': 'http://www.w3.org/2002/07/owl#'
    }
});

let wSparql = new WSparql({
    'sparqlFormatter': sparqlFormatter
});

let codeEditor = new CodeEditor({
    'wSparql': wSparql,
    'appConfig': appConfig
});

let queryExecutionForm = new QueryExecutionForm({
    form: '#formExecuteQuery',
    querySettingsList: '#selectQuerySettings',
    querySettingsRepository: querySettingsRepository,
    sparqlClient: new SparqlClient({
        graphIri: '',
        requestType: 'POST',
        requestDataType: 'html',
        debugMode: 'on',
    }),
    sparqlFormatter: sparqlFormatter,
    codeEditor: codeEditor
});

let queryHistoryLocalRepository = new QueryHistoryLocalRepository();
let queryLocalRepository = new QueriesLocalRepository(queryHistoryLocalRepository);
let queriesSharedRepository = new QueriesSharedRepository(queryHistoryLocalRepository);

let queryLeavingConfirmation = new QueryLeavingConfirmation('#queryLeavingConfirmation');
let queryListManager = new QueryListManager(queryLeavingConfirmation);
let commonPrefixes = new CommonPrefixes({
    codeEditor: codeEditor,
    sparqlFormatter: sparqlFormatter
});

let localQueryList = new QueryList('#local-query-list', queryLocalRepository, codeEditor);
queryListManager.manage(localQueryList);

if (appConfig.isBackendInstalled) {
    let sharedQueryList = new SharedQueryList('#shared-query-list', queriesSharedRepository, codeEditor);
    queryListManager.manage(sharedQueryList);

    let sharedQuery = sharedQueryList.repository.get(QueryShare.getSharedQueryId());
    if (sharedQuery) {
        let listItem = queryListManager.getListElementById(sharedQueryList, sharedQuery.id);
        if (listItem) {
            queryListManager.selectItem(sharedQueryList, sharedQuery.id, true)
        } else {
            queryListManager.addItem(sharedQueryList, sharedQuery, true, false);
            queryListManager.selectItem(sharedQueryList, sharedQuery.id, true)
        }
    } else {
        queryListManager.selectDefaultItem();
    }

    $('#buttonDeleteSharedQuery').click(function() {
        queryListManager.deleteItem(sharedQueryList, sharedQueryList.getActiveItemId());
    });
    $('#buttonSaveSharedQuery').click(function() {
        queryListManager.saveItem(sharedQueryList)
    });
    $('#buttonShareQuery').click(function() {
        let item = {
            name: queryListManager.getSelectedItemName(),
            query: codeEditor.getEditorValue(),
            default_graph_uri: $('.query-execution').find('input[name="default_graph_uri"]').val(),
            endpoint: $('.query-execution').find('input[name="endpoint"]').val()
        };
        let sharedQueryId = queryListManager.addItem(sharedQueryList, item);
        QueryShare.share(sharedQueryId);
    });
} else {
    queryListManager.selectDefaultItem();
    $('[data-ability=backend]').attr('disabled', 'disabled').attr('title', 'This function available only on full version');
    $('#shared-query-list').hide();
}

if (appConfig.isWSparqlEnabled()) {
    $('#buttonEnableWSparql').prop('checked', true);
}

$('#buttonAddLocalQuery').click(function() {
    let newItem = {
        query: ''
    };
    let newItemId = queryListManager.addItem(localQueryList, newItem);
    queryListManager.selectItem(localQueryList, newItemId);
});
$('#buttonDeleteLocalQuery').click(function() {
    queryListManager.deleteItem(localQueryList, localQueryList.getActiveItemId());
});
$('#buttonSaveLocalQuery').click(function() {
    queryListManager.saveItem(localQueryList);
});

//TODO: вынести в commonPrefixes или в CodeEditor?
function getAllPrefixes() {
    return Object.assign({}, commonPrefixes.getArray(), codeEditor.editor.getPrefixesFromQuery());
}

$('#buttonBeautify').click(function() {
    let beautifiedContent = sparqlFormatter.beautify(codeEditor.getEditorValue());
    codeEditor.setValue(beautifiedContent);
});
$('#buttonRemoveMinus').click(function() {
    let contentWithoutMinus = sparqlFormatter.removeAllOperatorsByName(codeEditor.getEditorValue(), 'minus');
    codeEditor.setValue(contentWithoutMinus);
});
$('#buttonExpand').click(function() {
    let expandedUriContent = sparqlFormatter.expandUri(codeEditor.getEditorValue(), getAllPrefixes());
    codeEditor.setValue(expandedUriContent);
});
$('#buttonCompact').click(function() {
    let compactedUriContent = sparqlFormatter.compactUri(codeEditor.getEditorValue(), getAllPrefixes());
    codeEditor.setValue(compactedUriContent);
});
$('#buttonShowSpCompactedView').click(function() {
    let isChecked = $(this).is(':checked');
    if (isChecked) {
        showSpCompactedView();
    }
    codeEditor.toggleEditorCopy(isChecked);
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
    let removeSingletonResult = sparqlFormatter.removeSingletonProperties(codeEditor.getEditorValue());

    if (removeSingletonResult.deleted_uri.length > 0) {
        localStorage.setItem('spe.contentWithoutSingleton', removeSingletonResult.result);
        let confirmationElement = $('#deletingSpUriConfirmation');
        confirmationElement.find('.uri-list').text(removeSingletonResult.deleted_uri);
        confirmationElement.modal('show');
    } else {
        codeEditor.setValue(removeSingletonResult.result);
    }
});
$('#buttonDeleteSpUri').click(function () {
    codeEditor.setValue(localStorage.getItem('spe.contentWithoutSingleton'));
});
$('#buttonAddSingleton').click(function() {
    let addSingletonResult = sparqlFormatter.addSingletonProperties(codeEditor.getEditorValue());
    codeEditor.setValue(addSingletonResult);
});
$('#buttonShowQueryResult').click(function() {
    $('#queryExecutionResult').modal('show');
});
$(document).on('keydown', function(e) {
    if (e.ctrlKey && e.which === 83){
        queryListManager.saveItem();
    }
});

window.markedUndefinedVariables = [];
function markUndefinedVariables() {
    let editorContent = codeEditor.getEditorValue();
    let needUndefinedVariablesChecking = editorContent.search(/}/) > -1 && editorContent.search(/where/i) > -1;
    if (markedUndefinedVariables.length) {
        markedUndefinedVariables.forEach(function(mark) {
            mark.clear();
        });
    }
    if (needUndefinedVariablesChecking) {
        let undefinedVariables = sparqlFormatter.getUndefinedVariables(codeEditor.getEditorValue());
        if (undefinedVariables.length) {
            undefinedVariables.forEach(function(variable) {
                let mark = codeEditor.editor.getDoc().markText({
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

window.markedVariablesWitoutParents = [];
function markVariablesWithoutParents() {
    let editorContent = codeEditor.getEditorValue();
    let groupedTripleData = sparqlFormatter.getGroupedTripleData(editorContent);
    let predicatesAndObjects = groupedTripleData.predicates.concat(groupedTripleData.objects);
    let contentLines = editorContent.split('\n');
    let lineCount = contentLines.length;
    let lineVariablesRegexp = new RegExp(sparqlFormatter.variablesRegexpCode, 'g');
    let variablesWithoutParents = [];
    let inWhereClause = false;
    if (markedVariablesWitoutParents.length) {
        markedVariablesWitoutParents.forEach(function(mark) {
            mark.clear();
        });
    }
    for (let i = 0; i < lineCount; i++) {
        let currentString = contentLines[i];
        //TODO: this algorithm isn't consider nested SELECT/WHERE pairs
        //TODO: some variables in nested SELECT clause will marked
        if (inWhereClause === false) {
            let whereClausePosition = currentString.search(/where/i);
            if (whereClausePosition > -1) {
                inWhereClause = true;
                lineVariablesRegexp.lastIndex = whereClausePosition;
            }
        }
        if (inWhereClause === true) {
            let lineVariables = [];
            while (lineVariables = lineVariablesRegexp.exec(currentString)) {
                if (_.indexOf(predicatesAndObjects, lineVariables[0]) === -1) {
                    let variable = {
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
        if (codeEditor.editor.findMarksAt({line: variable.line, ch: variable.startIndex}).length === 0) {
            let mark = codeEditor.editor.getDoc().markText({
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
codeEditor.editor.on('change', function() {
    markUndefinedVariables();
    markVariablesWithoutParents();
});

//TODO !!!
window.markedReplacedSingletonPoperites = [];
function showSpCompactedView() {
    markedReplacedSingletonPoperites = [];
    // Remove sp properties
    let removeSingletonResult = sparqlFormatter.removeSingletonProperties(codeEditor.editorCopy.getValue(), true);
    codeEditor.editorCopy.setValue(removeSingletonResult.result);

    // Add marks
    let replacedVariables = removeSingletonResult.replaced_variables;
    if (replacedVariables.length) {
        let contentLines = codeEditor.editorCopy.getValue().split('\n');
        let lineCount = contentLines.length;
        let predicates;

        let afterSelectClause = false;
        let replacedVariablesMarks = [];
        for (let i = 0; i < lineCount; i++) {
            let currentString = contentLines[i];
            let matchingReplacedVariable = replacedVariables[0];

            let openedOperatorRegexp = new RegExp('\{', 'i');
            if (matchingReplacedVariable) {
                //TODO: simplified after select-clause checking!
                if (!afterSelectClause) {
                    if (openedOperatorRegexp.test(currentString)) {
                        afterSelectClause = true;
                    }
                }

                if (afterSelectClause) {
                    let predicateRegexp = new RegExp(_.escapeRegExp(matchingReplacedVariable.predicate), 'gi');
                    let isPredicateFound = false;

                    while (predicates = predicateRegexp.exec(currentString)) {
                        let replacedVariableMark = {
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
            let mark = codeEditor.editorCopy.getDoc().markText({
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
 * Property autocomplete (ctrl+space handler)
 */
function autoCompletePredicate() {
    let sparqlClient = new SparqlClient({
        graphIri: queryExecutionForm.getGraphIri(),
        requestUrl: queryExecutionForm.getEndpoint(),
        requestType: 'POST',
        requestDataType: 'jsonp',
        debugMode: 'on',
        responseFormat: 'json',
    });

    // Define select
    let autoCompleteSelect = $('select[name="predicate-autocomplete"]');
    autoCompleteSelect.empty();

    // Define current subject
    let currentSubject = sparqlFormatter.getFirstVariable(codeEditor.editor.doc.getLine(codeEditor.editor.getCursor().line));
    if (currentSubject === null) {
        $.notify('<strong>Subject for autocomplete not found!</strong><br>', { type: 'warning', placement: { from: 'bottom', align: 'right' } });
        return false;
    } else {
        // Build query
        let queryData = sparqlFormatter.buildPredicatesChain(codeEditor.getEditorValue(true), currentSubject);
        let query = sparqlFormatter.addSingletonProperties(sparqlFormatter.expandUri(sparqlFormatter.buildQueryByPredicatesChain(queryData), getAllPrefixes()));

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
                let autoCompleteItems = data.results.bindings;
                if (!_.isEmpty(autoCompleteItems)) {
                    let options = '';
                    _.forEach(autoCompleteItems, function(item) {
                        options += '<option value="'+ item.property.value + '">' + item.label.value + ' (' + item.property.value + ')' + '</option>';
                    });
                    autoCompleteSelect.append(options);
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
    autoCompletePredicate();
});
document.addEventListener("keydown", function (zEvent) {
    if (zEvent.ctrlKey  &&  zEvent.keyCode === 32) {
        autoCompletePredicate();
    }
});

/**
 * Handle autocomplete select changing
 */
$('select[name="predicate-autocomplete"]').change(function(e) {
    codeEditor.insertString('<' + $(this).val() + '>');
});

$('#buttonEnableWSparql').click(function(e) {
    appConfig.setIsWSparqlEnabled($(this).is(':checked'));
});
$('#buttonToWsparql').click(function() {
    codeEditor.setValue(wSparql.toWSparql(codeEditor.getEditorValue()));
});
