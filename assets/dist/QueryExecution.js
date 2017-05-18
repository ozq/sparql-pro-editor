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

    // Get form data
    var endpoint = $(this).find('input[name="endpoint"]').val().replace(/\?/g, '');
    var graphUri = $(this).find('input[name="default-graph-uri"]').val();

    // Save form data
    localStorage.setItem('spe.queryExecution', JSON.stringify({
        'default-graph-uri': graphUri,
        'endpoint': endpoint
    }));

    // Build request parameters
    var parameters = {
        'default-graph-uri': graphUri,
        'query': editor.getValue()
    };

    // Send request
    var requestUrl = endpoint + '?' + jQuery.param(parameters);
    window.open(requestUrl, '_blank');
});
