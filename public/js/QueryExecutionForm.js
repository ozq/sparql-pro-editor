class QueryExecutionForm {
    constructor(form, querySettingsList, querySettingsRepository) {
        this.form = $(form);
        this.querySettingsList = $(querySettingsList);
        this.querySettingsRepository = querySettingsRepository;
        this.buildForm();
        this.initListeners();
    };

    buildForm() {
        this.buildQuerySettingsList();
        this.fillForm(JSON.parse(localStorage.getItem('spe.queryExecutionFormData')));
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
        var form = this;
        var querySettingsItems = this.querySettingsRepository.getAll();

        form.querySettingsList.html('');
        querySettingsItems.forEach(function(querySettings) {
            var selectItemText = querySettings.endpoint + ' (' + querySettings.default_graph_uri + ')';
            form.querySettingsList.append($('<option></option>').attr('value', querySettings.id).text(selectItemText));
        });
    }

    initListeners() {
        var form = this;
        this.form.submit(function(e) {
            e.preventDefault();

            // Get form data
            var endpoint = $(this).find('input[name="endpoint"]').val().replace(/\?/g, '');
            var graphUri = $(this).find('input[name="default_graph_uri"]').val();

            // Save form data
            localStorage.setItem('spe.queryExecutionFormData', JSON.stringify($(this).serializeArray()));
            form.querySettingsRepository.add({
                'default_graph_uri': graphUri,
                'endpoint': endpoint
            });
            form.buildQuerySettingsList();

            // Build request parameters
            var parameters = {
                'default-graph-uri': graphUri,
                'query': editor.getValue(),
                'debug': 'on'
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

        this.querySettingsList.change(function(e) {
            var parameters = [];
            var selectedQuerySettings = form.querySettingsRepository.get($(this).val());

            if (selectedQuerySettings) {
                Object.keys(selectedQuerySettings).forEach(function(key) {
                    parameters.push({
                        name: key,
                        value: selectedQuerySettings[key]
                    });
                });
                form.fillForm(parameters);
            }
        });
    }
}
