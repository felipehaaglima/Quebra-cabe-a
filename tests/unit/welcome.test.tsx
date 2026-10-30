import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Welcome } from "../../src/components/landing/welcome";

describe("início", () => {
  it("apresenta a proposta e informa que o jogo está em desenvolvimento", () => {
    render(<Welcome />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Uma peça");
    expect(screen.getByRole("button", { name: "Iniciar" })).toHaveAccessibleDescription(/Em desenvolvimento/);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
  it("explica a indisponibilidade ao iniciar, sem prometer gameplay", async () => {
    const user = userEvent.setup();
    render(<Welcome />);
    await user.click(screen.getByRole("button", { name: "Iniciar" }));
    expect(screen.getByRole("status")).toHaveTextContent("A montagem ainda não está disponível");
    await user.click(screen.getByRole("button", { name: "Iniciar" }));
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });
});
