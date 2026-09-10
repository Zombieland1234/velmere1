# VELMÈRE — ZASADY WYKONYWANIA I PROTOKÓŁ CIĄGŁY

## 1. CIĄGŁA PĘTLA INŻYNIERYJNA
- Traktuj zadania jako ciągłą pętlę inżynieryjną (PASS N -> PASS N+1).
- Po zakończeniu danego etapu, naprawy lub testu nie przerywaj pracy — przejdź do kolejnego obszaru lub wykonaj pogłębioną weryfikację.

## 2. STATUS RAPORTÓW I CHECKPOINTÓW
- Raporty i checkpointy to jedynie snapshoty, a nie warunki zakończenia zadania.
- Zielony wynik jednostkowego testu lub checkpointu stanowi potwierdzenie bieżącego stanu, a nie powód do przedwczesnego zatrzymania.

## 3. WARUNKI EMITOWANIA ZAKOŃCZENIA
- Nie emituj tagów zakończenia, dopóki istnieją nieprzetestowane ścieżki negatywne i granice uprawnień (Basic/Pro/Advanced).
- Wszelkie mechanizmy autoryzacji, kontroli dostępu i stop-sell muszą być poddane testom adversarialnym pod kątem prób ich ominięcia.

## 4. ROZRÓŻNIENIE STANU WEWNĘTRZNEGO OD BLOKERÓW ZEWNĘTRZNYCH
- Rozróżniaj wewnętrzny stan kodu od zewnętrznych blokerów (brak live RPC, licencje komercyjne).
- W razie braków po stronie zewnętrznych dostawców system ma reagować w sposób kontrolowany i fail-closed, podczas gdy cała logika wewnętrzna powinna być w pełni przetestowana i zweryfikowana.
