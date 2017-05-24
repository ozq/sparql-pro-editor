initCommonPrefixesData();
initQueryExecutionForm();

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
    beautifyCode();
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
    var removeSingletonResult = removeSingletonProperties(editor.getValue());

    if (removeSingletonResult.deleted_uri.length > 0) {
        localStorage.setItem('spe.contentWithoutSingleton', removeSingletonResult.result);
        var confirmationElement = $('#deletingSpUriConfirmation');
        confirmationElement.find('.uri-list').text(removeSingletonResult.deleted_uri);
        confirmationElement.modal('show');
    } else {
        editor.setValue(removeSingletonResult.result);
        //TODO: уйти от использования beautifyCode! Из-за него дольше выполняется функция.
        beautifyCode();
    }
});
$('#buttonDeleteSpUri').click(function () {
    editor.setValue(localStorage.getItem('spe.contentWithoutSingleton'));
    //TODO: уйти от использования beautifyCode! Из-за него дольше выполняется функция.
    beautifyCode();
});
$('#buttonAddSingleton').click(function() {
    var addSingletonResult = addSingletonProperties(editor.getValue());
    editor.setValue(addSingletonResult);
    //TODO: уйти от использования beautifyCode! Из-за него дольше выполняется функция.
    beautifyCode();
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
