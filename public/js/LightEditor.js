class LightEditor {
    constructor(configuration) {
        this.loadConfiguration(configuration);

        this.sparqlFormatter = new SparqlFormatter();
        this.selectedClass = null;
        this.loadClasses();
        this.selectedProperties = this.getSelectedProperties();

        this.initSelectedPropertyTree();
        this.initBuildQueryButton();
    }

    loadConfiguration(configuration) {
        if (typeof configuration === 'object') {
            this.configuration = configuration;
            this.classesSelectElement = this.loadConfigurationItem('classesSelectElement');
            this.propertyTreeElement = this.loadConfigurationItem('propertyTreeElement');
            this.selectedPropertyTreeElement = this.loadConfigurationItem('selectedPropertyTreeElement');
            this.queryInputElement = this.loadConfigurationItem('queryInputElement');
            this.buildQueryElement = this.loadConfigurationItem('buildQueryElement');
            this.sparqlClient = this.loadConfigurationItem('sparqlClient');
        } else {
            console.error('Configuration must be instance of object!');
        }
    }

    loadConfigurationItem(option, defaultValue, type) {
        if (this.configuration.hasOwnProperty(option) && this.configuration[option]) {
            if (typeof type !== 'undefined') {
                if (typeof this.configuration[option] !== type) {
                    console.error('Option ' + option + ' must be type of ' + type + '!');
                }
            }
            return this.configuration[option];
        } else {
            if (typeof defaultValue !== 'undefined') {
                return defaultValue;
            } else {
                console.error('Option ' + option + ' must be passed and be defined!');
            }
        }
    }

    loadClasses() {
        var self = this;
        self.classes = [];

        var query =
            'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n' +
            'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n' +
            'PREFIX owl: <http://www.w3.org/2002/07/owl#>' +
            'SELECT ?class ?label WHERE {\n' +
                '?class rdf:type owl:Class.\n' +
                '?class rdfs:label ?label.\n' +
            '}';

        var loadCallback = function (data) {
            var result = JSON.parse(data.responseText).results.bindings;
            result.forEach(function(item) {
                self.classes[item.class.value] = item.label.value;
            });
            self.initClassesSelect();
        };

        this.sparqlClient.execute(
            this.sparqlFormatter.addSingletonProperties(query),
            function (data) { loadCallback(data) },
            function (data) { loadCallback(data) }
        );
    }

    loadProperties(classUri, callback) {
        classUri = classUri.indexOf('http') === 0 ? '<' + classUri + '>' : classUri;

        var query =
            'PREFIX crm2: <http://sp7.ru/ontology/>\n' +
            'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n' +
            'PREFIX owl: <http://www.w3.org/2002/07/owl#>\n' +
            'SELECT ?property ?class ?label WHERE {\n' +
            classUri + ' crm2:restriction ?restriction.\n' +
                '?restriction rdfs:label ?label.\n' +
                '?restriction owl:allValuesFrom ?class.\n' +
                '?restriction owl:onProperty ?property.\n' +
            '}';

        this.sparqlClient.execute(
            this.sparqlFormatter.addSingletonProperties(query),
            function (data) { callback(data) },
            function (data) { callback(data) }
        );
    }

    getSelectedProperties() {
        return this.selectedProperties;
    }

    getQuery() {
        return document.querySelector(this.queryInputElement).value;
    }

    initPropertyTree(data = []) {
        var self = this;
        var propertyTreeData = [];

        for (var property in data) {
            propertyTreeData.push({
                title: data[property].label + ' (' + property + ')',
                shortTitle: data[property].label,
                class: data[property].class,
                property: property,
                key: _.uniqueId()
            });
        }

        var propertyTreeElement = $(this.propertyTreeElement);
        var selectedPropertyTreeElement = $(this.selectedPropertyTreeElement);

        propertyTreeElement.fancytree({
             checkbox: true,
             source: propertyTreeData,
             extensions: ['glyph'],
             icon: false,
             glyph: {
                 preset: "bootstrap3",
                 map: {
                     expanderClosed: "glyphicon glyphicon-menu-right",
                     expanderLazy: "glyphicon glyphicon-menu-right",
                     expanderOpen: "glyphicon glyphicon-menu-down"
                 }
             },
             dblclick: function(event, nodeData) {
                 self.loadProperties(nodeData.node.data.class, function (data) {
                     var parentNodeData = nodeData;
                     var result = JSON.parse(data.responseText).results.bindings;
                     parentNodeData.node.removeChildren();
                     result.forEach(function (item) {
                         parentNodeData.node.addChildren({
                             title: item.label.value + ' (' + item.property.value + ')',
                             class: item.class.value,
                             property: item.property.value,
                             shortTitle: item.label.value
                         });
                     });
                 });
             },
             select: function(event, nodeData) {
                 var node = nodeData.node;
                 var chain = [];

                 function goThrowParents(node, chain) {
                     var parentNode = node.getParent();
                     if (parentNode) {
                         chain.push(node);
                         goThrowParents(parentNode, chain);
                     }
                 }
                 goThrowParents(node, chain);

                 chain.reverse();

                 var selectedPropertyTitle = [];
                 chain.forEach(function (item) {
                     selectedPropertyTitle.push(item.data.shortTitle);
                 });

                 var selectedNode = {
                     title: selectedPropertyTitle.join('.'),
                     chain: chain
                 };

                 var selectedPropertyTreeRootNode = selectedPropertyTreeElement.fancytree('getRootNode');
                 selectedPropertyTreeRootNode.addChildren(selectedNode);
             }
         });

         $(this.propertyTreeElement).fancytree('option', 'source', propertyTreeData);
    }

    initSelectedPropertyTree(data = []) {
        $(this.selectedPropertyTreeElement).fancytree({
            source: data,
            extensions: ['dnd'],
            icon: false,
            dnd: {
                autoExpandMS: 400,
                preventVoidMoves: true,
                preventRecursiveMoves: true,
                dragStart: function(node, data) {
                    return true;
                },
                dragStop: function(node, data) {
                    return true;
                },
                dragEnter: function(node, data) {
                    if (node.parent !== data.otherNode.parent) return false;
                    return true;
                },
                dragDrop: function(node, data) {
                    data.otherNode.moveTo(node, 'before');
                }
            },
        });
    }

    initClassesSelect() {
        var self = this;
        var classesSelect = document.querySelector(self.classesSelectElement);

        for (var key in self.classes) {
            var label = self.classes[key];
            var option = document.createElement('option');
            if (label) {
                option.innerHTML = label + ' (' + key + ')';
                option.value = key;
                classesSelect.appendChild(option);
            }
        }

        classesSelect.addEventListener('change', function () {
            self.selectedClass = this.options[this.selectedIndex].value;
            self.loadProperties(self.selectedClass, function (data) {
                var properties = [];
                var result = JSON.parse(data.responseText).results.bindings;
                result.forEach(function (item) {
                    properties[item.property.value] = {
                        label: item.label.value,
                        class: item.class.value
                    };
                });
                self.initPropertyTree(properties);
                self.initSelectedPropertyTree([]);
            });
        });

        classesSelect.selectedIndex = -1;
    }

    initBuildQueryButton() {
        var self = this;

        document.querySelector(this.buildQueryElement).addEventListener('click', function(e) {
            self.buildQuery();
        });
    }

    buildQuery() {
        var selectedNodes = $(this.selectedPropertyTreeElement).fancytree('getTree').getRootNode().children;

        var globalChainData = [];
        selectedNodes.forEach(function (selectedNode) {
            var properties = [];
            var selectedNodeChain = selectedNode.data.chain;
            selectedNodeChain.forEach(function (chainNode) {
                properties.push(chainNode.data.property);
                if (_.has(globalChainData, properties) === false) {
                    _.set(globalChainData, properties, []);
                }
            });
        });


        console.log(globalChainData);

        function buildQueryBody(properties, query) {
            properties.forEach(function (property, children) {
                query += 'OPTIONAL {}';
                return buildQueryBody(children, query);
            });
        }

        var queryBody = buildQueryBody(globalChainData, '');



        //TODO: тут строим sparql в зависимости от выбранного класса selectedPropertyTree
    }
}
