import Link from "next/link";
import { PuzzleChoice } from "./puzzle-choice";

export function Welcome() {
  return (
    <>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6 sm:px-10">
        <Link className="brand" href="/" aria-label="Quebra-cabeça — início"><span aria-hidden="true">✣</span> quebra-cabeça</Link>
        <Link href="/account" className="account-link">Sua conta</Link>
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-6xl px-6 sm:px-10">
        <section className="hero" aria-labelledby="titulo">
          <div className="hero-copy">
            <p className="eyebrow">UM TEMPO SÓ SEU</p>
            <h1 id="titulo">Desacelere.<br />Uma peça<br /><em>de cada vez.</em></h1>
            <p className="intro">Uma mesa acolhedora, peças espalhadas e a alegria de ver tudo se encaixar. No seu ritmo.</p>
            <PuzzleChoice />
            <p id="aviso" className="development-note">Monte no seu ritmo · Seu progresso continua salvo neste navegador.</p>
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
