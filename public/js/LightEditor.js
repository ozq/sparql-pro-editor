class LightEditor {
    constructor(configuration) {
        this.isInitialPropertiesInitialized = false;
        this.loadConfiguration(configuration);
        this.initSelectedPropertyTree();
        this.loadClasses();
        this.loadInitialQuery();
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
            this.initialProperties = this.loadConfigurationItem('initialProperties', {});
            this.initialQuery = this.loadConfigurationItem('initialQuery', '');
            this.minusedVariables = this.loadConfigurationItem('minusedVariables', []);
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

    loadInitialQuery() {
        if (this.initialQuery && _.isEmpty(this.minusedVariables) === true) {
            this.minusedVariables = this.sparqlFormatter.getMinusedVariables(this.initialQuery);
        }
    }

    loadClasses() {
        var self = this;
        self.classes = [];
        self.classesStructure = {};

        var query =
            'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n' +
            'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n' +
            'PREFIX owl: <http://www.w3.org/2002/07/owl#>' +
            'SELECT ?class ?label ?parent WHERE {\n' +
                '?class rdf:type owl:Class.\n' +
                '?class rdfs:label ?label.\n' +
                'OPTIONAL {\n' +
                    '?class rdfs:subClassOf ?parent.\n' +
                '}\n' +
            '}\n' +
            'ORDER BY ASC(?label)';

        var loadCallback = function (data) {
            var result = JSON.parse(data.responseText).results.bindings;
            result.forEach(function(item) {
                if (item.label.value) {
                    self.classes.push({
                        'class': item.class.value,
                        'label': item.label.value,
                        'parent': item.parent ? item.parent.value : null,
                    });
                }
            });

            function getParentsChain (className, chain = []) {
                if (!className) {
                    return _.reverse(chain);
                } else {
                    chain.push(className);
                    var classItem = _.find(self.classes, function (item) { return item.class === className; });
                    if (classItem && classItem.parent !== className) {
                        return getParentsChain(classItem.parent, chain);
                    } else {
                        return _.reverse(chain);
                    }
                }
            }

            self.classes.forEach(function (item) {
                var chain = getParentsChain(item.parent);
                if (chain.length >= 1) {
                    chain = chain.join('*children*').split('*');
                    var parentItem = _.find(self.classes, function (o) { return o.class === item.parent; });
                    var parentLabel = parentItem ? parentItem.label : '';
                    _.set(self.classesStructure, _.concat(chain, 'label'), parentLabel);
                    chain.push('children');
                    var itemStructure = _.get(self.classesStructure, chain, {});
                    if (_.isEmpty(itemStructure[item.class]) === true) {
                        itemStructure[item.class] = {
                            label: item.label,
                            children: {}
                        };
                    }
                    _.set(self.classesStructure, chain, itemStructure);
                } else {
                    if (_.has(self.classesStructure, item.class) === false) {
                        self.classesStructure[item.class] = {
                            label: item.label,
                            children: {}
                        };
                    }
                }
            });

            var keysSorted = Object.keys(self.classesStructure).sort(function (a, b) {
                return self.classesStructure[a].label.localeCompare(self.classesStructure[b].label);
            });
            var sortedStructure = {};
            keysSorted.forEach(function (className) {
                sortedStructure[className] = self.classesStructure[className];
            });

            self.classesStructure = sortedStructure;

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
                    data.forEach(function (item) {
                        var foundNode = parentNodeData.node.findFirst(function (node) {
                            return node.data.property === item.property.value;
                        });
                        if (!foundNode) {
                            parentNodeData.node.addChildren({
                                title: item.label.value + ' (' + self.sparqlFormatter.compactUri(item.property.value, {}, false) + ')',
                                shortTitle: item.label.value,
                                isInverse: item.isInverse,
                                class: item.class.value,
                                property: item.property.value,
                                key: _.uniqueId()
                            });
                        }
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
                    var foundNode = selectedPropertyTreeElement.fancytree('getRootNode').addChildren({
                        title: selectedPropertyTitle.join('.'),
                        chain: chain
                    });
                    if (nodeData.node.data.isHidden) {
                        foundNode.addClass('hidden-node');
                    }
                } else {
                    $(self.selectedPropertyTreeElement).fancytree('getTree').findFirst(function (node) {
                        return _.isEqual(node.data.chain, chain);
                    }).remove();
                    nodeData.node.data.isHidden = false;
                }
            }
        });

        $(this.propertyTreeElement).fancytree('option', 'source', propertyTreeData);

        if (this.isInitialPropertiesInitialized === false) {
            self.buildInitialPropertiesTree();
            this.isInitialPropertiesInitialized = true;
        }
    }

    defineInitialPropertiesTree() {
        var initialPropertiesTree = null;
        if (this.initialProperties) {
            var i;
            var propertyPaths = [];
            initialPropertiesTree = this.initialProperties;
            for (i = initialPropertiesTree.length - 1; i >= 0; i -= 1) {
                var currentItem = initialPropertiesTree[i];
                var parentItem = _.find(initialPropertiesTree, function (foundItem) {
                    return foundItem.node.data.variableName === currentItem.node.data.parentVariableName;
                });
                if (!parentItem) {
                    parentItem = propertyPaths[currentItem.node.data.parentVariableName];
                }
                if (parentItem) {
                    parentItem.node.children.push(currentItem);
                    initialPropertiesTree.splice(i, 1);
                    propertyPaths[currentItem.node.data.variableName] = currentItem;
                }
            }
        }

        this.initialPropertiesTree = initialPropertiesTree;

        if (_.head(initialPropertiesTree)) {
            var rootClass = _.head(initialPropertiesTree).node.data.class;
            self.selectedClass = rootClass;
            $(this.classesSelectElement).val(rootClass).change();
        }

        return this.initialPropertiesTree;
    }

    buildInitialPropertiesTree() {
        var self = this;
        function pushNodes(node, treeNode = null) {
            if (node.data.parentVariableName === false) {
                treeNode = $(self.propertyTreeElement).fancytree('getTree').getRootNode();
            } else {
                var newNodeData = node.data;
                newNodeData.key = _.uniqueId();
                newNodeData.title = newNodeData.shortTitle + ' (' + self.sparqlFormatter.compactUri(newNodeData.property) + ')';
                var foundNode = treeNode.findFirst(function (node) {
                    return node.data.property === newNodeData.property;
                });

                if (!foundNode) {
                    treeNode = treeNode.addChildren(newNodeData);
                } else {
                    foundNode.data = _.merge(newNodeData, foundNode.data);
                    treeNode = foundNode;
                }

                treeNode.setSelected();
            }

            node.children.forEach(function (childrenNode) {
                pushNodes(childrenNode.node, treeNode);
            });
        }

        if (_.head(this.initialPropertiesTree)) {
            pushNodes(_.head(this.initialPropertiesTree).node);
        }

        $(self.propertyTreeElement).fancytree('getTree').visit(function (node) {
            node.toggleExpanded();
        });
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

        function buildOptionItem(className, item, depth = 0) {
            var option = document.createElement('option');
            option.innerHTML = '&nbsp;'.repeat(depth * 6) + item.label + ' (' + self.sparqlFormatter.compactUri(className, {}, false) + ')';
            option.value = className;
            classesSelect.appendChild(option);
            for (className in item.children) {
                depth++;
                var childItem = item.children[className];
                buildOptionItem(className, childItem, depth);
                depth--;
            }
        }

        for (var className in self.classesStructure) {
            buildOptionItem(className, self.classesStructure[className]);
        }

        $(self.classesSelectElement).change(function () {
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
                self.initSelectedPropertyTree([]);
                self.initPropertyTree(properties);
            });
        });

        classesSelect.selectedIndex = -1;
        self.defineInitialPropertiesTree();
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
                    _.set(properties, childProperties, {
                        'options': {
                            'isInverse': chainNode.data.isInverse,
                            'variableName': chainNode.data.variableName,
                            'isHidden': chainNode.data.isHidden,
                        }
                    });
                }
            });
        });

        function buildOptionalPart(property, childProperties, subjectVarName, objectVarName = '', query = '') {
            var isInverse = false;
            objectVarName = '?' + self.defineVariableNameByUri(property, objectVarName);

            if (_.has(childProperties, 'options.isInverse')) {
                isInverse = childProperties.options.isInverse;
            }
            if (_.has(childProperties, 'options.variableName')) {
                if (childProperties.options.variableName) {
                    objectVarName = childProperties.options.variableName;
                }
            }
            if (_.indexOf(self.minusedVariables, '-' + objectVarName) > -1) {
                objectVarName = '-' + objectVarName;
            }
            delete childProperties.options;

            var optionalPlaceholder = '%optionalPlaceholder%';
            property = property.indexOf('http') === 0 ? '<' + property + '>' : property;

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

        function buildQueryBody(properties) {
            var queryBody = '?resourceUri' + ' <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ' + '<' + self.selectedClass + '>' + '\n';
            _.forEach(properties, function(childProperties, property) {
                queryBody = queryBody + buildOptionalPart(property, childProperties, '?resourceUri');
            });
            queryBody = queryBody.replace(new RegExp('%optionalPlaceholder%', 'gi'), '');
            return queryBody;
        }

        function buildQueryPrefixes() {
            var prefixPart = '';
            _.forEach(self.sparqlFormatter.additionalPrefixes, function(uri, prefix) {
                prefixPart = prefixPart + '\n' + 'PREFIX ' + prefix + ': ' + '<' + uri + '>';
            });
            return prefixPart;
        }

        function buildQuery(properties) {
            var queryBody = buildQueryBody(properties);
            if (self.initialQuery) {
                // In this case we build only query body
                var queryLines = self.initialQuery.split('\n');
                var i = 0;
                var bracketsCounter = 0;
                var inWhereClause = false;
                var withoutWherePart = [];
                for (i; i < queryLines.length; i++) {
                    var currentLine = queryLines[i];
                    if (inWhereClause === false) {
                        if (currentLine.indexOf('WHERE') !== -1) {
                            inWhereClause = true;
                            withoutWherePart.push(currentLine);
                        }
                    }
                    if (inWhereClause === true) {
                        if (currentLine.indexOf('{') !== -1) { bracketsCounter++; }
                        if (currentLine.indexOf('}') !== -1) { bracketsCounter--; }
                    }
                    if (bracketsCounter <= 0) { inWhereClause = false; }
                    if (inWhereClause === false) {
                        withoutWherePart.push(currentLine);
                    }
                }
                return _.trim(withoutWherePart.join('\n'), '\"').replace(new RegExp('where\\s*{\\s*}', 'gi'), 'WHERE {\n' + queryBody + '}\n');
            } else {
                // In this case we build all query ourselves
                var selectedVariableNames = self.getSelectedVariableNames().join(' ');
                var prefixPart = buildQueryPrefixes();
                return self.sparqlFormatter.compactUri(
                    prefixPart + '\n' + 'SELECT ' + selectedVariableNames + ' WHERE {\n' + queryBody + '\n}'
                );
            }
        }

        var query = self.sparqlFormatter.compactUri(self.wsparql.toWSparql(buildQuery(properties)));

        console.log('Generated query:');
        console.log(query);

        return query;
    }
}
