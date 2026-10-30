import Link from "next/link";

export function Welcome() {
  return (
    <>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6 sm:px-10">
        <Link className="brand" href="/" aria-label="Quebra-cabeça — início"><span aria-hidden="true">✣</span> quebra-cabeça</Link>
        <span className="version">PRIMEIRAS PEÇAS · 0.1</span>
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-6xl px-6 sm:px-10">
        <section className="hero" aria-labelledby="titulo">
          <div className="hero-copy">
            <p className="eyebrow">UM TEMPO SÓ SEU</p>
            <h1 id="titulo">Desacelere.<br />Uma peça<br /><em>de cada vez.</em></h1>
            <p className="intro">Uma mesa acolhedora, peças espalhadas e a alegria de ver tudo se encaixar. No seu ritmo.</p>
            <Link className="start-button" href="/play" aria-describedby="aviso">Iniciar <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 19 19 5M5 5h14v14" /></svg></Link>
            <p id="aviso" className="development-note">Explore a mesa · Peças e encaixes em desenvolvimento.</p>
          </div>
          <div className="illustration" aria-hidden="true">
            <div className="table-label">UM RESPIRO NO SEU DIA</div>
            <div className="felt"><div className="tile tile-one" /><div className="tile tile-two" /><div className="tile tile-three" /><div className="tile tile-four" /></div>
            <div className="loose-piece piece-one" /><div className="loose-piece piece-two" />
            <span className="illustration-caption">devagar também é um caminho.</span>
          </div>
        </section>
        <section className="features" aria-label="A experiência que estamos construindo">
          <article><span className="feature-number">01 /</span><h2>Sem pressa</h2><p>Sem cronômetro. Só o prazer de encaixar.</p></article>
          <article><span className="feature-number">02 /</span><h2>Do seu jeito</h2><p>Um espaço para explorar e organizar.</p></article>
          <article><span className="feature-number">03 /</span><h2>Onde você estiver</h2><p>Pensado primeiro para a tela do celular.</p></article>
        </section>
      </main>
      <footer className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-3 px-6 py-8 sm:px-10"><span>Feito para aproveitar o caminho.</span><span>Um jogo em construção.</span></footer>
    </>
  );
}
