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
