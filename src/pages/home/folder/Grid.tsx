import { Box, Grid, Text } from "@hope-ui/solid"
import { createMemo, For, Show } from "solid-js"
import { GridItem } from "./GridItem"
import "lightgallery/css/lightgallery-bundle.css"
import { smartCountMsg, local, objStore } from "~/store"
import { useSelectWithMouse } from "./helper"
import { ObjType, StoreObj } from "~/types"

type GridEntry = {
  obj: StoreObj
  index: number
}

const nameWithoutExt = (name: string) => {
  const ext = name.lastIndexOf(".")
  return ext > 0 ? name.slice(0, ext).toLowerCase() : ""
}

const visibleGridEntries = () => {
  const videoBases = new Set(
    objStore.objs
      .filter((obj) => obj.type === ObjType.VIDEO)
      .map((obj) => nameWithoutExt(obj.name))
      .filter(Boolean),
  )
  return objStore.objs.reduce<GridEntry[]>((entries, obj, index) => {
    const name = obj.name.toLowerCase()
    const isVideoCover =
      obj.type === ObjType.IMAGE &&
      (name.endsWith(".jpg") || name.endsWith(".jpeg")) &&
      videoBases.has(nameWithoutExt(name))
    if (!isVideoCover) entries.push({ obj, index })
    return entries
  }, [])
}

const GridLayout = () => {
  const entries = createMemo(visibleGridEntries)
  const { isMouseSupported, registerSelectContainer, captureContentMenu } =
    useSelectWithMouse()
  registerSelectContainer()
  return (
    <>
      <Show when={local["show_count_msg"] === "visible"}>
        <Box w="100%" textAlign="left" pl="$2">
          <Text size="sm" color="$neutral11">
            {smartCountMsg()}
          </Text>
        </Box>
      </Show>
      <Grid
        oncapture:contextmenu={captureContentMenu}
        class="viselect-container"
        w="$full"
        gap="$1"
        templateColumns={`repeat(auto-fill, minmax(${
          parseInt(local["grid_item_size"]) + 20
        }px,1fr))`}
      >
        <For each={entries()}>
          {(entry) => {
            return <GridItem obj={entry.obj} index={entry.index} />
          }}
        </For>
      </Grid>
    </>
  )
}

export default GridLayout
