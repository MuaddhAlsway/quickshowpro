export const dateFormat = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
        weekend: "short",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric"
    })
}