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
    var requestUrl = endpoint + '?' + jQuery.param(parameters);

    // Time execution variables
    var queryTimeExecutionStart;
    var queryTimeExecutionEnd;
    var queryTimeExecution;

    // Send request
    $.ajax({
        url: requestUrl,
        dataType: 'html',
        beforeSend: function() {
            queryTimeExecutionStart = new Date().getTime();
            $('#buttonShowQueryResult').attr('disabled', true).removeClass('btn-info').addClass('btn-secondary');
        }
    }).always(function(response) {
        queryTimeExecutionEnd = new Date().getTime();
        queryTimeExecution = queryTimeExecutionEnd - queryTimeExecutionStart;

        var responseContent = _.isObject(response) ? response.responseText : response;

        $('.query-execution-result_response').html(responseContent);
        $('.query-execution-time_value').html(queryTimeExecution + ' ms.');
        $('#buttonShowQueryResult').removeAttr('disabled').removeClass('btn-secondary').addClass('btn-info');
    });

    // Show response
    $('#queryExecutionResult').modal('show');
});
