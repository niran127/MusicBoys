// hier komen interfaces
interface Artist{
    name:string,
    id:string,
    popularity:number,
    genres:string[],
    images:{
        url:string,
        height:number,
        width:number
    }[],
    external_urls:{
        spotify:string
    }
}

interface Track{
    name:string,
    popularity:number,
    duration_ms:number,
    artists:{
        name:string,
        id:string
    }[],
    album:{
        name:string,
        release_date:string,
        images:{
            url:string,
            height:number,
            width:number
        }[],
        external_urls:{
            spotify:string
        }
    }
    uri:string
}

export interface Artists{
    artists:{
        items:Artist[] 
    }   
}

export interface Tracks{
    tracks:{
        items:Track[]
    }
}