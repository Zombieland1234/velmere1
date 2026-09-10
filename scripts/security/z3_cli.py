import sys
import z3

def main():
    s = z3.Solver()
    smt = sys.stdin.read()
    try:
        s.from_string(smt)
        res = s.check()
        if res == z3.unsat:
            print("unsat")
        elif res == z3.sat:
            print("sat")
            try:
                m = s.model()
                print("(")
                for d in m.decls():
                    print(f"  (define-fun {d.name()} () Int {m[d]})")
                print(")")
            except Exception:
                pass
        else:
            print("unknown")
    except Exception as e:
        sys.stderr.write(str(e) + "\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
