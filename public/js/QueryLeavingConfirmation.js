class QueryLeavingConfirmation {
    constructor(element) {
        this.element = $(element);
    }

    show(leavingQueryId, nextQueryId) {
        this.element.modal('show');
        this.element.find('input[name="leavingQueryId"]').val(leavingQueryId);
        this.element.find('input[name="nextQueryId"]').val(nextQueryId);
    };

    getNextQueryId() {
        return this.element.find('input[name="nextQueryId"]').val();
    }
}
