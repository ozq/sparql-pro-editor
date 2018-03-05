export default class QueryExecutionForm {
    constructor(configuration) {
        this.form = $(configuration.form);
        this.querySettingsList = $(configuration.querySettingsList);
        this.querySettingsRepository = configuration.querySettingsRepository;
        this.sparqlFormatter = configuration.sparqlFormatter;
        this.sparqlClient = configuration.sparqlClient;
        this.codeEditor = configuration.codeEditor;
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
            let form = this.form;
            parameters.forEach(function(item) {
                let input = form.find('input[name="' + item.name + '"]');
                if (input.length) {
                    input.val(item.value);
                }
            });
        }
    }

    buildQuerySettingsList() {
        let self = this;
        let querySettingsItems = this.querySettingsRepository.getAll();

        self.querySettingsList.html('');
        querySettingsItems.forEach(function(querySettings) {
            let selectItemText = querySettings.endpoint + ' (' + querySettings.default_graph_uri + ')';
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
        let self = this;

        this.form.submit(function(e) {
            e.preventDefault();
            function showResult(queryTimeExecutionStart) {
                let queryTimeExecutionEnd = new Date().getTime();
                let queryTimeExecution = queryTimeExecutionEnd - queryTimeExecutionStart;
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
                let queryTimeExecutionStart = new Date().getTime();
                if (method === 'POST') {
                    self.sparqlClient.requestUrl = endpoint;
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
                    let requestUrl = endpoint + '?' + jQuery.param(parameters);
                    responseElement.on('load', function() {
                        $(this).show();
                        showResult(queryTimeExecutionStart);
                    }).attr('src', requestUrl);
                }
            }

            // Get form data
            let query = self.codeEditor.getEditorValue(true);

            // Filter * from select part
            query = query.replace(new RegExp('SELECT\\s+(.+)\\sWHERE', 'i'), function (line, variablesLine) {
                return 'SELECT ' + (variablesLine.includes('*') ? '*' : variablesLine) + ' WHERE';
            });

            // Translate to wsparql
            if (self.codeEditor.appConfig.isWSparqlEnabled()) {
                query = self.sparqlFormatter.addSingletonProperties(query, true);
            }
            let method = query.length >= 1900 ? 'POST' : 'GET';
            let endpoint = self.getEndpoint();
            let graphUri = self.getGraphIri();

            // Save form data
            localStorage.setItem(self.key, JSON.stringify($(this).serializeArray()));
            self.querySettingsRepository.add({
                'default_graph_uri': graphUri,
                'endpoint': endpoint
            });
            self.buildQuerySettingsList();

            let parameters = {
                'default-graph-uri': graphUri,
                'query': query,
                'debug': 'on'
            };

            let responseElement = method === 'POST' ?
                $('div.query-execution-result_response') :
                $('iframe.query-execution-result_response');

            hideLastResult();
            sendRequest(endpoint, parameters, responseElement);

            $('#queryExecutionResult').modal('show');
        });

        this.querySettingsList.change(function(e) {
            let parameters = [];
            let selectedQuerySettings = self.querySettingsRepository.get($(this).val());

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
