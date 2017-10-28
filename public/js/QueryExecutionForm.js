class QueryExecutionForm {
    constructor(form, querySettingsList, querySettingsRepository) {
        this.form = $(form);
        this.querySettingsList = $(querySettingsList);
        this.querySettingsRepository = querySettingsRepository;
        this.key = 'spe.queryExecutionFormData';
        this.initSparqlClient();
        this.buildForm();
        this.initListeners();
    };

    initSparqlClient() {
        this.sparqlClient = new SparqlClient({
            graphIri: '',
            requestType: 'POST',
            requestDataType: 'html',
            debugMode: 'on',
        });
    }

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
        var self = this;
        var querySettingsItems = this.querySettingsRepository.getAll();

        self.querySettingsList.html('');
        querySettingsItems.forEach(function(querySettings) {
            var selectItemText = querySettings.endpoint + ' (' + querySettings.default_graph_uri + ')';
            self.querySettingsList.append($('<option></option>').attr('value', querySettings.id).text(selectItemText));
        });
    }

    getEndpoint() {
        return this.form.find('input[name="endpoint"]').val().replace(/\?/g, '');
    }

    getGraphIri() {
        return this.form.find('input[name="default_graph_uri"]').val();
    }

    initListeners() {
        var self = this;

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
                    self.sparqlClient.requestUrl = parameters['endpoint'];
                    self.sparqlClient.graphIri = parameters['default-graph-uri'];
                    self.sparqlClient.execute(
                        query,
                        function(data) {
                            showResult(queryTimeExecutionStart);
                            responseElement.html(data).show();
                        },
                        function(data) {
                            showResult(queryTimeExecutionStart);
                            responseElement.html(data.responseText).show();
                        }
                    );
                } else {
                    var requestUrl = endpoint + '?' + jQuery.param(parameters);
                    responseElement.on('load', function() {
                        $(this).show();
                        showResult(queryTimeExecutionStart);
                    }).attr('src', requestUrl);
                }
            }

            // Get form data
            var query = getEditorValue();
            if ($('#buttonEnableWSparql').is(':checked')) {
                query = sparqlFormatter.addSingletonProperties(query, true);
            }
            var method = query.length >= 1900 ? 'POST' : 'GET';
            var endpoint = self.getEndpoint();
            var graphUri = self.getGraphIri();

            // Save form data
            localStorage.setItem(self.key, JSON.stringify($(this).serializeArray()));
            self.querySettingsRepository.add({
                'default_graph_uri': graphUri,
                'endpoint': endpoint
            });
            self.buildQuerySettingsList();

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
            var selectedQuerySettings = self.querySettingsRepository.get($(this).val());

            if (selectedQuerySettings) {
                Object.keys(selectedQuerySettings).forEach(function(key) {
                    parameters.push({
                        name: key,
                        value: selectedQuerySettings[key]
                    });
                });
                self.fillForm(parameters);
            }
        });
    }
}
