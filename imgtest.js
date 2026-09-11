const container = document.querySelector(".main-result"); 
const shwrapper = document.querySelector(".show-wrapper"); 
const minWidth = 150; 
const maxColumns = 6; 
const gap = 1; 
let start = 0; 
const maxStart = 30; 
let isLoading = false; 
let lastFetchHeight = 0; 

// Mengambil query pencarian dari parameter URL
const urlParams = new URLSearchParams(window.location.search);
const searchQuery = urlParams.get("q") || "";

function positionItems() { 
    const items = Array.from(container.querySelectorAll(".img-tb")); 
    if (items.length === 0) return; 
    const containerWidth = container.clientWidth; 
    let cols = Math.floor(containerWidth / (minWidth + gap)); 
    cols = Math.max(1, Math.min(maxColumns, cols)); 
    let itemWidth = Math.floor((containerWidth - (cols - 1) * gap) / cols); 
    let columnHeights = new Array(cols).fill(0); 
    items.forEach((item) => { 
        let imgThumb = item.querySelector(".img-thumb"); 
        item.style.width = `${itemWidth}px`; 
        imgThumb.style.width = `${itemWidth - 8}px`; 
        let colIndex = columnHeights.indexOf(Math.min(...columnHeights)); 
        let topPos = columnHeights[colIndex]; 
        let leftPos = colIndex * (itemWidth + gap); 
        item.style.position = "absolute"; 
        item.style.left = `${leftPos}px`; 
        item.style.top = `${topPos}px`; 
        let itemHeight = item.getBoundingClientRect().height + gap; 
        columnHeights[colIndex] += itemHeight; 
    }); 
    container.style.height = `${Math.max(...columnHeights) + 80}px`; 
} 

window.addEventListener("resize", positionItems); 

function fetchData() { 
    if (isLoading || start > maxStart) return; 
    isLoading = true; 
    
    fetch(`https://images.searchdata.workers.dev/dimage?q=${encodeURIComponent(searchQuery)}&start=${start}`)
    .then(response => response.json())
    .then(response => { 
        console.log(response); 
        renderResults(response); 
        start += 10; 
        lastFetchHeight = document.body.scrollHeight; 
        shwrapper.innerHTML = ''; 
        shwrapper.style.position = 'absolute'; 
    }).catch(error => { 
        isLoading = false; 
        shwrapper.innerHTML = ''; 
        shwrapper.style.position = 'absolute'; 
        console.log(error.message); 
    }); 
} 

function renderResults(res) { 
    let fragment = document.createDocumentFragment(); 
    for (let i = 0; i < res.images.length; i++) { 
        let imgElement = document.createElement("img"); 
        imgElement.src = res.images[i].thumbnail; 
        imgElement.loading = "lazy"; 
        imgElement.alt = res.images[i].title; 
        
        let imgContainer = document.createElement("div"); 
        imgContainer.classList.add("img-tb"); 
        imgContainer.setAttribute("tabindex", `tab-${i}`); 
        let originurl = new URL(res.images[i].pageUrl); 
        
        imgContainer.innerHTML = ` 
            <div class="img-th"> 
                <div class="img-dt"> 
                    <div class="img-thumb" style=""> </div> 
                    <a class="info" href="${res.images[i].pageUrl}"> 
                        <p class="title" name="t">${res.images[i].title}</p> 
                        <p class="i-desc"> 
                            <img data-src="" src="https://datasearch.searchdata.workers.dev/img/${encodeURIComponent(originurl.hostname)}"> 
                            <span>${res.images[i].siteName}</span> 
                        </p> 
                    </a> 
                </div> 
            </div>`; 
        
        loadImage(imgElement, res.images[i].thumbnail, res.images[i].image); 
        imgContainer.querySelector(".img-thumb").appendChild(imgElement); 
        
        imgElement.onload = function() { 
            positionItems(); 
        }; 
        
        imgElement.onerror = function() { 
            let parent = imgElement.closest(".img-tb"); 
            if (parent) parent.remove(); 
            positionItems(); 
        }; 
        
        fragment.appendChild(imgContainer); 
    } 
    container.insertBefore(fragment, shwrapper); 
    isLoading = false; 
    positionItems(); 
} 

function getRandomValue() { 
    const values = [100, 140, 160, 200]; 
    return values[Math.floor(Math.random() * values.length)]; 
} 

function loadImage(imgElement, thumbnailSrc, fullSrc) { 
    imgElement.src = thumbnailSrc; 
    imgElement.style.filter = "blur(2px)"; 
    imgElement.style.transition = "filter .5s ease-in-out"; 
    const fullImage = new Image(); 
    fullImage.src = fullSrc; 
    fullImage.onload = function() { 
        imgElement.src = fullSrc; 
        imgElement.style.filter = "blur(0)"; 
    }; 
    setTimeout(() => { 
        imgElement.style.filter = "blur(0)"; 
        imgElement.removeAttribute("style"); 
    }, 5000); 
} 

function setImagePlaceholder(im, imurl) { 
    let img = new Image(); 
    img.src = imurl; 
    img.onload = function () { 
        const aspectRatio = img.height / img.width; 
        wrapper.style.paddingTop = `${aspectRatio * 100}%`; 
        wrapper.querySelector("img").src = img.src; 
        wrapper.classList.add("loaded"); 
    }; 
} 

function getImageSize(imageUrl) { 
    return new Promise((resolve) => { 
        const img = new Image(); 
        img.onload = function() { 
            resolve([this.width, this.height]); 
        }; 
        img.onerror = function() { 
            resolve([null, null]); 
        }; 
        img.src = imageUrl; 
    }); 
} 

window.addEventListener("scroll", function() { 
    if (isLoading) return; 
    const scrollThreshold = 200; 
    const hasScrolledPastLastFetch = window.scrollY > lastFetchHeight - scrollThreshold; 
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100 && hasScrolledPastLastFetch) { 
        shwrapper.innerHTML = `<div class="loader"><svg class="circular" viewBox="25 25 50 50"><circle class="path" cx="50" cy="50" r="20" fill="none" stroke-width="4" stroke-miterlimit="10"/></svg></div>`; 
        setTimeout(fetchData, 1000); 
    } 
}); 

fetchData(); 

function isMobile() { 
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent); 
} 

if (isMobile()) { 
    document.querySelector(".cbKRN").insertAdjacentHTML("beforeend", ` 
        <div class="preview"> 
            <div class="p-header"> 
                <div class="left"> 
                    <div class="p-fav"> 
                        <img src=""> 
                    </div> 
                    <div class="title"></div> 
                </div> 
                <div class="right"> 
                    <div class="p-fav close-preview"> 
                        <svg viewBox="0 0 24 24" focusable="false" height="24" width="24"> 
                            <path d="M0 0h24v24H0z" fill="none"></path> 
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path> 
                        </svg> 
                    </div> 
                </div> 
            </div> 
            <div class="thumbnail"> 
                <img src="" alt="Preview"> 
            </div> 
            <div class="jtext-p"> 
                <div class="left"> 
                    <div class="title"></div> 
                    <div class="d"></div> 
                </div> 
                <div class="right"> 
                    <button><a href="">Kunjungi</a></button> 
                </div> 
            </div> 
        </div> 
    `); 
    
    const preview = document.querySelector(".preview"); 
    preview.style.display = "none"; 
    
    function hidePreview() { 
        preview.style.display = "none"; 
        document.documentElement.style.overflow = "auto"; 
    } 
    
    document.querySelector(".close-preview").addEventListener("click", hidePreview); 
    
    document.body.addEventListener("click", (event) => { 
        const img = event.target.closest(".img-thumb img"); 
        if (!img) { return; } 
        event.preventDefault(); 
        const rect = img.getBoundingClientRect(); 
        const clone = img.cloneNode(true); 
        document.body.appendChild(clone); 
        clone.style.position = "fixed"; 
        clone.style.background = "#ededed"; 
        clone.style.top = `${rect.top}px`; 
        clone.style.left = `${rect.left}px`; 
        clone.style.width = `${rect.width}px`; 
        clone.style.height = `${rect.height}px`; 
        clone.style.zIndex = "9999"; 
        clone.style.borderRadius = "10px"; 
        clone.style.transition = "all 0.3s ease-in-out"; 
        clone.style.objectFit = "cover"; 
        
        const preview = document.querySelector(".preview"); 
        const previewImg = preview ? preview.querySelector(".thumbnail img") : null; 
        if (!preview || !previewImg) { return; } 
        
        const previewRect = previewImg.getBoundingClientRect(); 
        const aspectRatio = rect.width / rect.height; 
        const newHeight = 260; 
        const newWidth = newHeight * aspectRatio; 
        const centerX = (window.innerWidth - newWidth) / 2; 
        const centerY = previewRect.top + 55; 
        
        setTimeout(() => { 
            clone.style.transform = "scale(1.05)"; 
        }, 50); 
        
        setTimeout(() => { 
            clone.style.top = `${centerY}px`; 
            clone.style.left = `${centerX}px`; 
            clone.style.width = `${newWidth}px`; 
            clone.style.height = `${newHeight}px`; 
            
            setTimeout(() => { 
                document.body.removeChild(clone); 
                showPreview(img); 
            }, 150); 
        }, 200); 
    }); 
    
    function showPreview(img) { 
        const preview = document.querySelector(".preview"); 
        if (!preview) return; 
        preview.style.display = "block"; 
        document.documentElement.style.overflow = "hidden"; 
        const parent = img.closest(".img-tb"); 
        if (parent) { 
            const titleElement = parent.querySelector(".info .title"); 
            const descElement = parent.querySelector(".i-desc span"); 
            const infoLinkElement = parent.querySelector(".info"); 
            const descImgElement = parent.querySelector(".i-desc img"); 
            if (titleElement) { 
                preview.querySelector(".jtext-p .left .title").innerText = titleElement.innerText; 
            } 
            if (descElement) { 
                preview.querySelector(".jtext-p .left .d").innerText = "Gambar mungkin saja memiliki hak cipta."; 
                preview.querySelector(".p-header .title").innerText = descElement.innerText; 
            } 
            if (infoLinkElement) { 
                preview.querySelector(".jtext-p .right a").href = infoLinkElement.href; 
            } 
            if (descImgElement) { 
                preview.querySelector(".p-fav img").src = descImgElement.src; 
            } 
            preview.querySelector(".thumbnail img").src = img.src; 
            preview.querySelector(".thumbnail img").alt = img.alt; 
        } 
    } 
}
