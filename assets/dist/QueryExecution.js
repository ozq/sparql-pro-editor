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

    var responseElement = $('.query-execution-result_response');

    // Clear result
    $('#buttonShowQueryResult').attr('disabled', true).removeClass('btn-info').addClass('btn-secondary');
    $('#buttonExecuteQuery').attr('disabled', true);
    $('.query-execution-time').hide();
    $('.query-execution-result_loader').show();
    responseElement.hide();

    // Load result
    queryTimeExecutionStart = new Date().getTime();
    responseElement.on('load', function(e) {
        queryTimeExecutionEnd = new Date().getTime();
        queryTimeExecution = queryTimeExecutionEnd - queryTimeExecutionStart;
        $('.query-execution-result_loader').hide();
        $('.query-execution-time_value').html(queryTimeExecution + ' ms.');
        $('.query-execution-time').show();
        $('#buttonShowQueryResult').removeAttr('disabled').removeClass('btn-secondary').addClass('btn-info');
        $('#buttonExecuteQuery').removeAttr('disabled');
        $(this).show();
    }).attr('src', requestUrl);

    // Show result
    $('#queryExecutionResult').modal('show');
});
