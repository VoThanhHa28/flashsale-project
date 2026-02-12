const asyncHandler = fn => {
    return (req, res, next) => {
        fn(req, res, next).catch(next); // Nếu lỗi, đẩy thẳng xuống middleware lỗi
    };
};
module.exports = asyncHandler;