initHistoryMenu();
initCommonPrefixesData();
initQueryExecutionForm();

function getQueryPrefixes() {
    return editor.getPrefixesFromQuery();
}

function getAllPrefixes() {
    return Object.assign({}, getCommonPrefixesArray(), getQueryPrefixes());
}

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
    saveCurrentQuery();
    selectQueryHistoryItem(QueryLeavingConfirmation.getNextQueryId());
});
$('#buttonLeaveCurrentQuery').click(function() {
    selectQueryHistoryItem(QueryLeavingConfirmation.getNextQueryId(), true);
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
