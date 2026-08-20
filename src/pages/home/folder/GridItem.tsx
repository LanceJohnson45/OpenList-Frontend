import { Center, VStack, Icon, Text } from "@hope-ui/solid"
import { Motion } from "solid-motionone"
import { useContextMenu } from "solid-contextmenu"
import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  Show,
} from "solid-js"
import { CenterLoading, LinkWithPush, ImageWithError } from "~/components"
import { useLink, usePath, useRouter, useUtil } from "~/hooks"
import {
  checkboxOpen,
  getMainColor,
  local,
  objStore,
  selectIndex,
} from "~/store"
import { ObjType, StoreObj } from "~/types"
import { bus, hoverColor } from "~/utils"
import { getIconByObj } from "~/utils/icon"
import { ItemCheckbox, useSelectWithMouse } from "./helper"

const maxConcurrentThumbnailLoads = 5
let activeThumbnailLoads = 0
const pendingThumbnailLoads: Array<() => void> = []

const pumpThumbnailQueue = () => {
  while (
    activeThumbnailLoads < maxConcurrentThumbnailLoads &&
    pendingThumbnailLoads.length > 0
  ) {
    pendingThumbnailLoads.shift()?.()
  }
}

const queueThumbnailLoad = (start: (release: () => void) => void) => {
  let started = false
  let canceled = false
  let released = false
  const release = () => {
    if (!started || released) return
    released = true
    activeThumbnailLoads = Math.max(0, activeThumbnailLoads - 1)
    pumpThumbnailQueue()
  }
  const run = () => {
    if (canceled) return
    started = true
    activeThumbnailLoads += 1
    start(release)
  }
  pendingThumbnailLoads.push(run)
  pumpThumbnailQueue()
  return () => {
    canceled = true
    const index = pendingThumbnailLoads.indexOf(run)
    if (index >= 0) pendingThumbnailLoads.splice(index, 1)
    release()
  }
}

export const GridItem = (props: { obj: StoreObj; index: number }) => {
  const { isHide } = useUtil()
  if (isHide(props.obj)) {
    return null
  }
  const { setPathAs } = usePath()
  const objIcon = (
    <Icon
      color={getMainColor()}
      boxSize={`${parseInt(local["grid_item_size"]) - 30}px`}
      as={getIconByObj(props.obj)}
    />
  )
  const { show } = useContextMenu({ id: 1 })
  const { pushHref, to } = useRouter()
  const { rawLink } = useLink()
  const { openWithDoubleClick, toggleWithClick, restoreSelectionCache } =
    useSelectWithMouse()
  const previewSrc = createMemo(() => {
    if (props.obj.thumb) return props.obj.thumb
    if (props.obj.type === ObjType.IMAGE) return rawLink(props.obj)
    if (props.obj.type !== ObjType.VIDEO) return ""
    const ext = props.obj.name.lastIndexOf(".")
    if (ext <= 0) return ""
    const base = props.obj.name.slice(0, ext).toLowerCase()
    const cover = objStore.objs.find((obj) => {
      const name = obj.name.toLowerCase()
      return (
        obj.type === ObjType.IMAGE &&
        (name === `${base}.jpg` || name === `${base}.jpeg`)
      )
    })
    return cover ? rawLink(cover) : ""
  })
  const [queuedPreviewSrc, setQueuedPreviewSrc] = createSignal("")
  let releasePreviewLoad = () => {}
  createEffect(() => {
    const src = previewSrc()
    releasePreviewLoad()
    releasePreviewLoad = () => {}
    setQueuedPreviewSrc("")
    if (!src) return
    releasePreviewLoad = queueThumbnailLoad((release) => {
      releasePreviewLoad = release
      setQueuedPreviewSrc(src)
    })
  })
  onCleanup(() => {
    releasePreviewLoad()
  })
  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        width: "100%",
      }}
    >
      <VStack
        classList={{ selected: !!props.obj.selected }}
        class="grid-item viselect-item"
        data-index={props.index}
        w="$full"
        p="$1"
        spacing="$1"
        rounded="$lg"
        transition="all 0.3s"
        _hover={{
          transform: "scale(1.06)",
          bgColor: hoverColor(),
        }}
        as={LinkWithPush}
        href={props.obj.name}
        cursor={
          openWithDoubleClick() || toggleWithClick() ? "default" : "pointer"
        }
        bgColor={props.obj.selected ? hoverColor() : undefined}
        on:dblclick={() => {
          if (!openWithDoubleClick()) return
          selectIndex(props.index, true, true)
          to(pushHref(props.obj.name))
        }}
        on:click={(e: MouseEvent) => {
          e.preventDefault()
          if (openWithDoubleClick()) return
          if (e.ctrlKey || e.metaKey || e.shiftKey) return
          if (!restoreSelectionCache()) return
          if (toggleWithClick())
            return selectIndex(props.index, !props.obj.selected)
          to(pushHref(props.obj.name))
        }}
        onMouseEnter={() => {
          setPathAs(props.obj.name, props.obj.is_dir, true)
        }}
        onContextMenu={(e: MouseEvent) => {
          batch(() => {
            // if (!checkboxOpen()) {
            //   toggleCheckbox();
            // }
            selectIndex(props.index, true, true)
          })
          show(e, { props: props.obj })
        }}
      >
        <Center
          class="item-thumbnail"
          h={`${parseInt(local["grid_item_size"])}px`}
          w="$full"
          cursor={props.obj.type !== ObjType.IMAGE ? "inherit" : "pointer"}
          on:click={(e: MouseEvent) => {
            if (props.obj.type !== ObjType.IMAGE) return
            if (e.ctrlKey || e.metaKey || e.shiftKey) return
            if (!restoreSelectionCache()) return
            bus.emit("gallery", props.obj.name)
            e.preventDefault()
            e.stopPropagation()
          }}
          pos="relative"
        >
          <Show when={checkboxOpen()}>
            <ItemCheckbox
              pos="absolute"
              left="$1"
              top="$1"
              // colorScheme="neutral"
              on:mousedown={(e: MouseEvent) => {
                e.stopPropagation()
              }}
              on:click={(e: MouseEvent) => {
                e.stopPropagation()
              }}
              checked={props.obj.selected}
              onChange={(e: any) => {
                selectIndex(props.index, e.target.checked)
              }}
            />
          </Show>
          <Show when={previewSrc()} fallback={objIcon}>
            <Show
              when={queuedPreviewSrc()}
              fallback={<CenterLoading size="lg" />}
            >
              <ImageWithError
                maxH="$full"
                maxW="$full"
                rounded="$lg"
                shadow="$md"
                fallback={<CenterLoading size="lg" />}
                fallbackErr={objIcon}
                src={queuedPreviewSrc()}
                loading="lazy"
                onLoad={releasePreviewLoad}
                onError={releasePreviewLoad}
              />
            </Show>
          </Show>
        </Center>
        <Text
          css={{
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
          w="$full"
          overflow="hidden"
          textAlign="center"
          fontSize="$sm"
          title={props.obj.name}
        >
          {props.obj.name}
        </Text>
      </VStack>
    </Motion.div>
  )
}
