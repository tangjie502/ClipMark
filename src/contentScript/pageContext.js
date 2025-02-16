function addLatexToMathJax3()
{
    if (!MathJax?.startup?.document?.math)
        return

    for (math of MathJax.startup.document.math)
    {
        math.typesetRoot.setAttribute("marksnip-latex", math.math)
    }
}
addLatexToMathJax3()
