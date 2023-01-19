export default (n, symbole = "", c = 0, d = ".", t = " ") => {
    const s = n < 0 ? "-" : "";
    const i = String(parseInt((n = Math.abs(Number(n) || 0).toFixed(c))));
    const j = i.length > 3 ? i.length % 3 : 0;
    return (
        s +
        (j ? i.substr(0, j) + t : "") +
        i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) +
        (c
            ? d +
              Math.abs(n - i)
                  .toFixed(c)
                  .slice(2)
            : "") +
        " " +
        symbole
    );
};