

const asyncHandler = (requestHandler)=>{
    return (req,res,next) =>{
        Promise.resolve(requestHandler(req,res,next)).
        catch((err)=>next(err))
    }
}

export {asyncHandler}
















// const asyncHandler = (fn) = () => {}
/*
eg. const asyncHandler = (func) => {() =>{}}
which is also
const asyncHandler = (func) => () =>{}
*/

/*
// of try catch
const asyncHandler = (fn) => async(req,res,next)=>{
    try {
        await fn(req,res,res);
    } catch (error) {
        res.status(err.code || 500).json({
            success:false,
            message: err.message;
        })
    }
}
*/