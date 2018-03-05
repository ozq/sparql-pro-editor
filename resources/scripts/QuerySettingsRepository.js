export default class QuerySettingsRepository {
    constructor() {
        this.key = 'spe.querySettingsRepository';
        this.items = [];
        this.maxItemsCount = 10;
    };

    getAll() {
        let all = JSON.parse(localStorage.getItem(this.key));
        let items = all ? all : [];

        return _.uniqWith(items, _.isEqual).reverse();
    };

    add(item) {
        item.id = _.now();
        let items = this.getAll().reverse();

        let uniqueItems =  _.filter(items, function(o) {
            return o.endpoint !== item.endpoint || o.default_graph_uri !== item.default_graph_uri;
        });
        uniqueItems.push(item);

        this.save(uniqueItems);
        return item;
    };

    get(id) {
        return this.getAll().filter(function(item){ return parseInt(item.id) === parseInt(id) })[0];
    };

    save(items) {
        items = _.takeRight(items, this.maxItemsCount);
        localStorage.setItem(this.key, JSON.stringify(items));
    };
}
