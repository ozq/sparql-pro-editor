var QueryLeavingConfirmation = new function() {
    this.element = $('#queryLeavingConfirmation');

    this.show = function (leavingQueryId, nextQueryId) {
        this.element.modal('show');
        this.element.find('input[name="leavingQueryId"]').val(leavingQueryId);
        this.element.find('input[name="nextQueryId"]').val(nextQueryId);
    };

    this.getNextQueryId = function () {
        return this.element.find('input[name="nextQueryId"]').val();
    }
};
