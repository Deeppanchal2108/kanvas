
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
export default function Home() {
  return (
    <div className=" bg-black h-screen w-full text-white">
      frontend
      <Button>Hello </Button>
      <ButtonGroup>
        <Button>Button 1</Button>
        <Button>Button 2</Button>
      </ButtonGroup>
    </div>
  );
}
