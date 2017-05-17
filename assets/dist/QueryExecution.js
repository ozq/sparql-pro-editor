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
    window.open(requestUrl, '_blank');
});
