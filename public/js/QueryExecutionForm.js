class QueryExecutionForm {
    constructor(form, querySettingsList, querySettingsRepository) {
        this.form = $(form);
        this.querySettingsList = $(querySettingsList);
        this.querySettingsRepository = querySettingsRepository;
        this.key = 'spe.queryExecutionFormData';
        this.buildForm();
        this.initListeners();
    };

    buildForm() {
        this.buildQuerySettingsList();
        this.fillForm(JSON.parse(localStorage.getItem(this.key)));
    }

    fillForm(parameters) {
        if (parameters) {
            var form = this.form;
            parameters.forEach(function(item) {
                var input = form.find('input[name="' + item.name + '"]');
                if (input.length) {
                    input.val(item.value);
                }
            });
        }
    }

    buildQuerySettingsList() {
        var thisObject = this;
        var querySettingsItems = this.querySettingsRepository.getAll();

        thisObject.querySettingsList.html('');
        querySettingsItems.forEach(function(querySettings) {
            var selectItemText = querySettings.endpoint + ' (' + querySettings.default_graph_uri + ')';
            thisObject.querySettingsList.append($('<option></option>').attr('value', querySettings.id).text(selectItemText));
        });
    }

    initListeners() {
        var thisObject = this;
        this.form.submit(function(e) {
            e.preventDefault();
            function showResult(queryTimeExecutionStart) {
                var queryTimeExecutionEnd = new Date().getTime();
                var queryTimeExecution = queryTimeExecutionEnd - queryTimeExecutionStart;
                $('.query-execution-result_loader').hide();
                $('.query-execution-time_value').html(queryTimeExecution + ' ms.');
                $('.query-execution-time').show();
                $('#buttonShowQueryResult').removeAttr('disabled').removeClass('btn-secondary').addClass('btn-info');
                $('.buttonExecuteQuery').removeAttr('disabled');
            }
            function hideLastResult() {
                $('#buttonShowQueryResult').attr('disabled', true).removeClass('btn-info').addClass('btn-secondary');
                $('.buttonExecuteQuery').attr('disabled', true);
                $('.query-execution-time').hide();
                $('.query-execution-result_response').hide();
                $('.query-execution-result_loader').show();
            }
            function sendRequest(endpoint, parameters, responseElement) {
                var queryTimeExecutionStart = new Date().getTime();
                if (method === 'POST') {
                    $.ajax({
                        type: "POST",
                        url: endpoint,
                        data: parameters,
                        dataType: 'html',
                        success: function (data) {
                            showResult(queryTimeExecutionStart);
                            responseElement.html(data).show();
                        },
                        error: function (data) {
                            showResult(queryTimeExecutionStart);
                            responseElement.html(data.responseText).show();
                        }
                    });
                } else {
                    var requestUrl = endpoint + '?' + jQuery.param(parameters);
                    responseElement.on('load', function() {
                        $(this).show();
                        showResult(queryTimeExecutionStart);
                    }).attr('src', requestUrl);
                }
            }

            // Get form data
            var query = editor.getValue();
            var method = query.length >= 1900 ? 'POST' : 'GET';
            var endpoint = thisObject.form.find('input[name="endpoint"]').val().replace(/\?/g, '');
            var graphUri = thisObject.form.find('input[name="default_graph_uri"]').val();

            // Save form data
            localStorage.setItem(this.key, JSON.stringify($(this).serializeArray()));
            thisObject.querySettingsRepository.add({
                'default_graph_uri': graphUri,
                'endpoint': endpoint
            });
            thisObject.buildQuerySettingsList();

            var parameters = {
                'default-graph-uri': graphUri,
                'query': query,
                'debug': 'on'
            };

            var responseElement = method === 'POST' ?
                $('div.query-execution-result_response') :
                $('iframe.query-execution-result_response');

            hideLastResult();
            sendRequest(endpoint, parameters, responseElement);

            $('#queryExecutionResult').modal('show');
        });

        this.querySettingsList.change(function(e) {
            var parameters = [];
            var selectedQuerySettings = thisObject.querySettingsRepository.get($(this).val());

            if (selectedQuerySettings) {
                Object.keys(selectedQuerySettings).forEach(function(key) {
                    parameters.push({
                        name: key,
                        value: selectedQuerySettings[key]
                    });
                });
                thisObject.fillForm(parameters);
            }
        });
    }
}
