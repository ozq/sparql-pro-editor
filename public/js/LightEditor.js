class LightEditor {
    constructor(configuration) {
        this.selectedClass = null;
        this.loadConfiguration(configuration);
        this.loadClasses();
        this.initSelectedPropertyTree();
        this.initBuildQueryButton();
    }

    loadConfiguration(configuration) {
        if (typeof configuration === 'object') {
            this.configuration = configuration;
            this.classesSelectElement = this.loadConfigurationItem('classesSelectElement');
            this.sparqlFormatter = this.loadConfigurationItem('sparqlFormatter');
            this.propertyTreeElement = this.loadConfigurationItem('propertyTreeElement');
            this.selectedPropertyTreeElement = this.loadConfigurationItem('selectedPropertyTreeElement');
            this.queryInputElement = this.loadConfigurationItem('queryInputElement');
            this.buildQueryElement = this.loadConfigurationItem('buildQueryElement');
            this.sparqlClient = this.loadConfigurationItem('sparqlClient');
            this.wsparql = this.loadConfigurationItem('wsparql');
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
            '}\n' +
            'ORDER BY ASC(?label)';

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
        var self = this;

        var forwardPropertiesQuery =
            'PREFIX crm2: <http://sp7.ru/ontology/>\n' +
            'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n' +
            'PREFIX owl: <http://www.w3.org/2002/07/owl#>\n' +
            'SELECT ?property ?class ?label WHERE {\n' +
            classUri + ' crm2:restriction ?restriction.\n' +
                '?restriction rdfs:label ?label.\n' +
                '?restriction owl:allValuesFrom ?class.\n' +
                '?restriction owl:onProperty ?property.\n' +
            '}';
        function forwardPropertiesLoaded(response) {
            var forwardProperties = JSON.parse(response.responseText).results.bindings;
            var inversePropertiesQuery =
                'PREFIX crm2: <http://sp7.ru/ontology/>\n' +
                'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n' +
                'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n' +
                'PREFIX owl: <http://www.w3.org/2002/07/owl#>\n' +
                'PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>\n' +
                'SELECT ?property ?class ?label ?backLabel WHERE {\n' +
                '   ?class crm2:restriction ?restriction.\n' +
                '   {\n' +
                '       ?restriction owl:allValuesFrom ' + classUri + '.\n' +
                '   }\n' +
                '   UNION\n' +
                '   {\n' +
                '       ?restriction owl:allValuesFrom owl:Thing.\n' +
                '   }\n' +
                '   ?restriction rdfs:label ?label.\n' +
                '   OPTIONAL {\n' +
                '       ?restriction crm2:backLabel ?backLabel.\n' +
                '   }\n' +
                '   ?restriction owl:onProperty ?property' +
                '   ?class rdf:type owl:Class.\n' +
                '}\n';
            function inversePropertiesLoaded(response) {
                var inverseProperties = JSON.parse(response.responseText).results.bindings;
                _.map(inverseProperties, function (object) {
                    object.isInverse = true;
                    var label = _.has(object, 'backLabel') ? object.backLabel.value : object.label.value;
                    object.label.value = 'inv_' + label + ' (' + self.sparqlFormatter.compactUri(object.class.value, {}, false) + ')';
                    return object;
                });
                var allProperties = forwardProperties.concat(inverseProperties);
                callback(allProperties);
            }
            self.sparqlClient.execute(
                self.sparqlFormatter.addSingletonProperties(inversePropertiesQuery),
                function (response) { inversePropertiesLoaded(response) },
                function (response) { inversePropertiesLoaded(response) },
            );
        }
        self.sparqlClient.execute(
            self.sparqlFormatter.addSingletonProperties(forwardPropertiesQuery),
            function (response) { forwardPropertiesLoaded(response) },
            function (response) { forwardPropertiesLoaded(response) },
        );
    }

    getQuery() {
        return document.querySelector(this.queryInputElement).value;
    }

    initPropertyTree(data = []) {
        var self = this;
        var propertyTreeData = [];

        for (var property in data) {
            propertyTreeData.push({
                title: data[property].label + ' (' + self.sparqlFormatter.compactUri(property, {}, false) + ')',
                shortTitle: data[property].label,
                class: data[property].class,
                isInverse: data[property].isInverse,
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
                     parentNodeData.node.removeChildren();
                     data.forEach(function (item) {
                         parentNodeData.node.addChildren({
                             title: item.label.value + ' (' + self.sparqlFormatter.compactUri(item.property.value, {}, false) + ')',
                             shortTitle: item.label.value,
                             isInverse: item.isInverse,
                             class: item.class.value,
                             property: item.property.value,
                             key: _.uniqueId()
                         });
                     });
                 });
             },
             select: function(event, nodeData) {
                 function goThrowParents(node, chain) {
                     var parentNode = node.getParent();
                     if (parentNode) {
                         chain.push(node);
                         goThrowParents(parentNode, chain);
                     }
                 }

                 var node = nodeData.node;
                 var chain = [];
                 goThrowParents(node, chain);
                 chain.reverse();

                 if (node.isSelected()) {
                     var selectedPropertyTitle = [];
                     chain.forEach(function (item) {
                         selectedPropertyTitle.push(item.data.shortTitle);
                     });
                     selectedPropertyTreeElement.fancytree('getRootNode').addChildren({
                         title: selectedPropertyTitle.join('.'),
                         chain: chain
                     });
                 } else {
                     $(self.selectedPropertyTreeElement).fancytree('getTree').findFirst(function (node) {
                         return _.isEqual(node.data.chain, chain);
                     }).remove();
                 }
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
                option.innerHTML = label + ' (' + self.sparqlFormatter.compactUri(key, {}, false) + ')';
                option.value = key;
                classesSelect.appendChild(option);
            }
        }

        classesSelect.addEventListener('change', function () {
            self.selectedClass = this.options[this.selectedIndex].value;
            self.loadProperties(self.selectedClass, function (data) {
                var properties = [];
                data.forEach(function (item) {
                    properties[item.property.value] = {
                        label: item.label.value,
                        class: item.class.value,
                        isInverse: item.isInverse
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
            $(self.queryInputElement).val(self.buildQuery());
        });
    }

    defineVariableNameByUri(uri, prevVarName = '') {
        prevVarName = prevVarName.replace(/\?/g, '');
        var propertyUriParts = uri.split('/');
        var objectVarBaseName = propertyUriParts[propertyUriParts.length - 1];
        var hashParts = objectVarBaseName.split('#');
        if (hashParts) {
            objectVarBaseName = hashParts[hashParts.length - 1];
        }
        return prevVarName === '' ?
            objectVarBaseName :
            prevVarName + objectVarBaseName.charAt(0).toUpperCase() + objectVarBaseName.slice(1);
    }

    getSelectedVariableNames() {
        var self = this;
        var selectedNodes = $(this.selectedPropertyTreeElement).fancytree('getTree').getRootNode().getChildren();
        var variables = [];
        selectedNodes.forEach(function (selectedNode) {
            var chain = selectedNode.data.chain;
            var variableName = '';
            chain.forEach(function (selectedNode) {
                variableName = self.defineVariableNameByUri(selectedNode.data.property, variableName);
            });
            variables.push('?' + variableName);
        });

        return _.uniq(variables);
    }

    buildQuery() {
        var self = this;
        var selectedNodes = $(this.selectedPropertyTreeElement).fancytree('getTree').getRootNode().children;

        var properties = {};
        selectedNodes.forEach(function (selectedNode) {
            var childProperties = [];
            selectedNode.data.chain.forEach(function (chainNode) {
                childProperties.push(chainNode.data.property);
                if (_.has(properties, childProperties) === false) {
                    _.set(properties, childProperties, {'isInverse': chainNode.data.isInverse});
                }
            });
        });

        function buildOptionalPart(property, childProperties, subjectVarName, objectVarName = '', query = '') {
            objectVarName = '?' + self.defineVariableNameByUri(property, objectVarName);
            var optionalPlaceholder = '%optionalPlaceholder%';
            property = property.indexOf('http') === 0 ? '<' + property + '>' : property;

            var isInverse = false;
            if (_.has(childProperties, 'isInverse')) {
                if (childProperties.isInverse === true) {
                    isInverse = true;
                }
                delete childProperties.isInverse;
            }

            var triple = isInverse ?
                objectVarName + ' ' + property + ' ' + subjectVarName :
                subjectVarName + ' ' + property + ' ' + objectVarName;

            var newQueryPart = _.isEmpty(childProperties) ?
                'OPTIONAL { \n' + triple + '\n}\n' + optionalPlaceholder :
                'OPTIONAL { \n' + triple + '\n' + optionalPlaceholder + '\n}\n';
            query = query === '' ? newQueryPart : query.replace('%optionalPlaceholder%', newQueryPart);

            _.forEach(childProperties, function(grandChildProperties, childProperty) {
                query = buildOptionalPart(childProperty, grandChildProperties, objectVarName, objectVarName, query);
            });

            return query;
        }

        function buildQuery(properties) {
            var queryBody = '?resourceUri' + ' <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ' + '<' + self.selectedClass + '>' + '\n';
            _.forEach(properties, function(childProperties, property) {
                queryBody = queryBody + buildOptionalPart(property, childProperties, '?resourceUri');
            });
            queryBody = queryBody.replace(new RegExp('%optionalPlaceholder%', 'gi'), '');
            var selectedVariableNames = self.getSelectedVariableNames().join(' ');

            //TODO: This logic (add prefix part) could be encapsulated in compactUri method,
            //TODO: just add additional param to this method, e.g. autoAddPrefixes.
            var prefixPart = '';
            _.forEach(self.sparqlFormatter.additionalPrefixes, function(uri, prefix) {
                prefixPart = prefixPart + '\n' + 'PREFIX ' + prefix + ': ' + '<' + uri + '>';
            });

            return self.sparqlFormatter.compactUri(
                prefixPart + '\n' + 'SELECT ' + selectedVariableNames + ' WHERE {\n' + queryBody + '\n}'
            );
        }

        var query = self.wsparql.toWSparql(buildQuery(properties));

        console.log('Generated query:');
        console.log(query);

        return query;
    }
}
